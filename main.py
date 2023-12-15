import pandas as pd
import urllib.request
import sys
import gridstatus
import csv
import codecs
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.tree import export_graphviz
import joblib
from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.python_operator import PythonOperator
from airflow.operators.bash_operator import BashOperator

default_args = {
    'owner': 'wendell',
    'depends_on_past': False,
    'email_on_failure': False,
    'email_on_retry': False,
    'retries': 1,
    'retry_delay': timedelta(minutes=15),
    'start_date': datetime(2023, 12, 11, 4, 30),
}

dag = DAG(
    'electricity_prediction',
    default_args=default_args,
    description='A simple DAG',
    # schedule_interval=timedelta(days=1),
    schedule_interval='30 4 * * *', 
    start_date=datetime(2023, 12, 11),
    end_date=datetime(2023, 12, 25),
    catchup=False,
)

def updateWeather():
    # update weather
    try: 
        ResultBytes = urllib.request.urlopen("https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/New%20York%20City%2CUSA/today?unitGroup=us&include=days&key=ZA6QXEW8B22JBE8ZQD4SUWSRX&contentType=csv")

        CSVText = csv.reader(codecs.iterdecode(ResultBytes, 'utf-8'))
        dataList = list(CSVText)

        # Create a DataFrame
        df = pd.DataFrame(dataList[1:], columns=dataList[0])  # Assuming the first row is the header
    
    except urllib.error.HTTPError  as e:
        ErrorInfo= e.read().decode() 
        print('Error code: ', e.code, ErrorInfo)
        sys.exit()
    except  urllib.error.URLError as e:
        ErrorInfo= e.read().decode() 
        print('Error code: ', e.code,ErrorInfo)
        sys.exit()

    old = pd.read_csv("gs://eecs_6893_wendell/project/weather.csv")
    df = pd.concat([old, df], ignore_index=True)
    df.to_csv("gs://eecs_6893_wendell/project/weather.csv", index=False)

def updateLoad():
    gridstatus.list_isos()
    nyiso = gridstatus.NYISO()
    load = pd.read_csv("gs://eecs_6893_wendell/project/load.csv")
    today = nyiso.get_fuel_mix("today")
    idx = ['Nuclear', 'Dual Fuel', 'Hydro', 'Natural Gas', 'Wind', 'Other Renewables', 'Other Fossil Fuels']
    today['total'] = today[idx].sum(axis=1)
    today = pd.concat([load, today], ignore_index=True)
    today.to_csv("gs://eecs_6893_wendell/project/load.csv", index=False)
    

def updatePrice():
    gridstatus.list_isos()
    nyiso = gridstatus.NYISO()
    old_price = pd.read_csv("gs://eecs_6893_wendell/project/price.csv")
    lmp_data = nyiso.get_lmp(date="today", market="REAL_TIME_5_MIN", locations="ALL")
    price = lmp_data.loc[lmp_data['Location']=='N.Y.C.']
    price = pd.concat([old_price, price], ignore_index=True)
    price.to_csv("gs://eecs_6893_wendell/project/price.csv", index=False)

def loadData(**kwargs):
    weatherRaw = pd.read_csv("gs://eecs_6893_wendell/project/weather.csv")
    weatherRaw = weatherRaw.drop_duplicates(subset='datetime')
    weatherRaw['Date'] = pd.to_datetime(weatherRaw['datetime']).dt.date
    cols = ['Date', 'tempmax', 'tempmin', 'temp']
    weather = weatherRaw[cols]

    load = pd.read_csv("gs://eecs_6893_wendell/project/load.csv")
    load = load.drop_duplicates(subset="Time")
    load['Time'] = pd.to_datetime(load['Time'], utc=True)
    load['Date'] = load['Time'].dt.date
    load = load.groupby(['Date'])[['Dual Fuel', 'Hydro' ,'Natural Gas','Nuclear','Other Fossil Fuels','Other Renewables','Wind','total']].sum()

    price = pd.read_csv("gs://eecs_6893_wendell/project/price.csv")
    price = price.drop_duplicates(subset="Time")
    price['Time'] = pd.to_datetime(price['Time'], utc=True)
    price['Date'] = price['Time'].dt.date
    price = price.groupby(['Date'])[['LMP']].mean()

    coal = pd.read_csv("gs://eecs_6893_wendell/project/coal_data.csv")
    ura = pd.read_csv("gs://eecs_6893_wendell/project/ura_data.csv")

    coal['coal_price'] = coal['Price']
    ura['ura_price'] = ura['Price']

    coal = coal.drop('Open', axis=1).drop('High', axis=1).drop('Low', axis=1).drop('Vol.', axis=1).drop('Change %', axis=1).drop('Price', axis=1)
    ura = ura.drop('Open', axis=1).drop('High', axis=1).drop('Low', axis=1).drop('Vol.', axis=1).drop('Change %', axis=1).drop('Price', axis=1)
    coal['Date'] = pd.to_datetime(coal['Date']).dt.date
    ura['Date'] = pd.to_datetime(ura['Date']).dt.date

    data = pd.merge(load, price, how='inner', on=['Date'])
    data = pd.merge(data, weather, how='left', on=['Date'])
    data = pd.merge(data, coal, how='left', on=['Date'])
    data = pd.merge(data, ura, how='left', on=['Date'])

    # data = data.dropna()
    data['dual_fuel'] = 100 * (data['Dual Fuel']/data['total'])
    data['hydro'] = 100 * (data['Hydro']/data['total'])
    data['natural_gas'] = 100 * (data['Natural Gas']/data['total'])
    data['nuclear'] = 100 * (data['Nuclear']/data['total'])
    data['other_fossil_fuels'] = 100 * (data['Other Fossil Fuels']/data['total'])
    data['other_renewables'] = 100 * (data['Other Renewables']/data['total'])
    data['wind'] = 100 * (data['Wind']/data['total'])
    data.fillna(method='ffill', inplace=True)
    data['nextprice'] = data['LMP'].shift(-1)
    data = data.dropna()
    data.to_csv("gs://eecs_6893_wendell/project/data.csv", index=False)
    ti = kwargs['ti']
    data_json = data.to_json()
    ti.xcom_push(key='data', value=data_json)
    # ti.xcom_push(key='data', value = data)


def training(**kwargs):
    ti = kwargs['ti']
    data_json = ti.xcom_pull(task_ids='load_data', key='data')
    data = pd.read_json(data_json)
    negtive_rel = ['temp','ura_price','hydro','nuclear','other_renewables']
    for idx in negtive_rel:
        data[idx] = 1.0/data[idx]
    train_set = data.iloc[:-1]
    X_train = train_set[['dual_fuel','hydro','natural_gas','nuclear','wind', 'temp', 'LMP', 'ura_price', 'coal_price']]
    Y_train = train_set[['nextprice']]
    scaler = StandardScaler()
    X_train = scaler.fit_transform(X_train)
    # X_test = scaler.transform(X_test)
    model = RandomForestRegressor(random_state=0)
    model.fit(X_train, Y_train)
    model_filepath = '/home/wl2927/airflow/dags/model.pkl'
    joblib.dump(model, model_filepath)
    ti = kwargs['ti']
    data_json = data.to_json()
    ti.xcom_push(key='model', value = data_json)
    ti.xcom_push(key='model_filepath', value=model_filepath)



def makePrediction(**kwargs):
    ti = kwargs['ti']
    data_json = ti.xcom_pull(task_ids='load_data', key='data')
    model_filepath = ti.xcom_pull(task_ids='training', key='model_filepath')
    model = joblib.load(model_filepath)
    data = pd.read_json(data_json)
    last_row = data.tail(1)
    today = last_row[['dual_fuel','hydro','natural_gas','nuclear','wind', 'temp', 'LMP', 'ura_price', 'coal_price']]
    val = model.predict(today)
    res = pd.DataFrame()
    res['Date'] = last_row['Date']
    res['Price'] = val
    res.to_csv("gs://eecs_6893_wendell/project/prediction.csv", index=False)


t1 = PythonOperator(
    task_id='update_weather',
    python_callable=updateWeather,
    provide_context=True,
    dag=dag,
)

t2 = PythonOperator(
    task_id='update_price',
    python_callable=updatePrice,
    provide_context=True,
    dag=dag,
)

t3 = PythonOperator(
    task_id='update_load',
    python_callable=updateLoad,
    provide_context=True,
    dag=dag,
)

t4 = PythonOperator(
    task_id = 'load_data',
    python_callable=loadData,
    provide_context=True,
    dag=dag,
)

t5 = PythonOperator(
    task_id = 'training',
    python_callable=training,
    provide_context=True,
    dag=dag,
)

t6 = BashOperator(
    task_id='upload_model',
    bash_command='gsutil cp /home/wl2927/airflow/dags/model.pkl gs://eecs_6893_wendell/project',
    dag=dag,
)

t7 = PythonOperator(
    task_id = 'make_prediction',
    python_callable=makePrediction,
    provide_context=True,
    dag=dag,
)

t1 >> t4
t2 >> t4
t3 >> t4
t4 >> t5
t5 >> t6
t6 >> t7