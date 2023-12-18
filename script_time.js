

    document.addEventListener("DOMContentLoaded", function() {
        // Get the current date and time
        const currentDate = new Date();
    
        // Set the time to yesterday at 11:00 PM
        currentDate.setDate(currentDate.getDate() - 1); // Move to yesterday
        currentDate.setHours(23, 0, 0, 0); // Set time to 11:00 PM
    
        // Update the "lastUpdated" element
        const lastUpdated = document.getElementById('UpdatedDate');
        lastUpdated.textContent += currentDate.toLocaleString();

        function movingAverage(data, numberOfPoints, valueKey) {
            return data.map((row, index, total) => {
                const start = Math.max(0, index - numberOfPoints);
                const end = index;
                const subset = total.slice(start, end + 1);
                const sum = subset.reduce((a, b) => a + b[valueKey], 0);
                return { ...row, [valueKey]: sum / subset.length };
            });
        }
    
        const movingAveragePoints = 15; // Adjust the window size as needed

        const csvFilePath = "https://cors-anywhere.herokuapp.com/https://storage.googleapis.com/eecs_6893_wendell/project/data.csv";
        const csvPrediction = "https://cors-anywhere.herokuapp.com/https://storage.googleapis.com/eecs_6893_wendell/project/prediction.csv";
        const csvResult = "https://cors-anywhere.herokuapp.com/https://storage.googleapis.com/eecs_6893_wendell/project/testset_result.csv";
    
        d3.csv(csvFilePath).then(function (data) {
            const parseDate = d3.timeParse("%Y-%m-%d");
            
            data.forEach(function (d) {
                d.Date = parseDate(d.Date);
                d.total = +d["total"]; 
                d.tempmax = +d["tempmax"]; 
                d.tempmin = +d["tempmin"]; 
                d.temp = +d["temp"]; 
                d.dual_fuel = +d["dual_fuel"]; 
                d.dual_fuel_smoothed = movingAverage(data, movingAveragePoints, 'dual_fuel').find(da => da.Date === d.Date).dual_fuel;
    
                d.hydro = +d["hydro"]; 
                d.hydro_smoothed = movingAverage(data, movingAveragePoints, 'hydro').find(da => da.Date === d.Date).hydro;
                
                d.natural_gas = +d["natural_gas"];
                d.natural_gas_smoothed = movingAverage(data, movingAveragePoints, 'natural_gas').find(da => da.Date === d.Date).natural_gas;
    
                d.nuclear = +d["nuclear"];
                d.nuclear_smoothed = movingAverage(data, movingAveragePoints, 'nuclear').find(da => da.Date === d.Date).nuclear;
    
                d.wind = +d["wind"]; 
                d.wind_smoothed = movingAverage(data, movingAveragePoints, 'wind').find(da => da.Date === d.Date).wind;
    
                d.other_renewables = +d["other_renewables"]; 
                d.other_renewables_smoothed = movingAverage(data, movingAveragePoints, 'other_renewables').find(da => da.Date === d.Date).other_renewables;
    
                d.other_fossil_fuels = +d["other_fossil_fuels"];
                d.other_fossil_fuels_smoothed = movingAverage(data, movingAveragePoints, 'other_fossil_fuels').find(da => da.Date === d.Date).other_fossil_fuels;
    
                d.coal_price = +d["coal_price"]; 
                d.ura_price = +d["ura_price"]; 
                d.dprice = +d["LMP"]; 
            });
            const formatDate = d3.timeFormat("%Y-%m-%d");
            document.getElementById('datePicker').addEventListener('change', function() {
                var selectedDate = this.value;
                var matchedData = data.find(d => formatDate(d.Date) === selectedDate);
                // var lmpFormatted = parseFloat(matchedData.LMP).toFixed(2);
                // console.log(matchedData)
                if (matchedData) {
                    var lmpFormatted = parseFloat(matchedData.LMP).toFixed(2); // Format to 2 decimal places
                    document.getElementById('lmpValue').textContent = lmpFormatted + " USD";
                } else {
                    document.getElementById('lmpValue').textContent = "No data for selected date";
                }
                
            });
        
            const margin = { top: 20, right: 20, bottom: 60, left: 75 };
            const width = 1500 - margin.left - margin.right;
            const height = 500 - margin.top - margin.bottom;
    
            // Create SVG for loadGraph
            const svgLoad = d3.select("#loadGraph")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            // Create scales for loadGraph
            const xScaleLoad = d3.scaleTime().range([0, width]);
            const yScaleLoad = d3.scaleLinear().range([height, 0]);
            // Create line generator for loadGraph
            const lineTotalLoad = d3.line()
                .x(d => xScaleLoad(d.Date))
                .y(d => yScaleLoad(d.total));
    
            // Create SVG for weatherGraph
            const svgWeather = d3.select("#weatherGraph")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            // Create scales for weatherGraph
            const xScaleWeather = d3.scaleTime().range([0, width]);
            const yScaleWeather = d3.scaleLinear().range([height, 0]);
            // Create line generators for weatherGraph
            const lineTempMax = d3.line()
                .x(d => xScaleWeather(d.Date))
                .y(d => yScaleWeather(d.tempmax));
            const lineTempMin = d3.line()
                .x(d => xScaleWeather(d.Date))
                .y(d => yScaleWeather(d.tempmin));
            const lineTemp = d3.line()
                .x(d => xScaleWeather(d.Date))
                .y(d => yScaleWeather(d.temp));
    
            // Create SVG for fuelMixGraph
            const svgFuelMix = d3.select("#fuelMixGraph")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            // Create scales for fuelMixGraph
            const xScaleFuelMix = d3.scaleTime().range([0, width]);
            const yScaleFuelMix = d3.scaleLinear().range([height, 0]);
            // Create line generators for fuelMixGraph
            const line_dual_fuel = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                // .y(d => yScaleFuelMix(d.dual_fuel));
                .y(d => yScaleFuelMix(d.dual_fuel_smoothed));
            const line_hydro = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                // .y(d => yScaleFuelMix(d.hydro));
                .y( d => yScaleFuelMix(d.hydro_smoothed));
            const line_natural_gas = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                .y(d => yScaleFuelMix(d.natural_gas_smoothed));
            const line_nuclear = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                .y(d => yScaleFuelMix(d.nuclear_smoothed));
            const line_wind = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                .y(d => yScaleFuelMix(d.wind_smoothed));
            const line_other_renewables = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                .y(d => yScaleFuelMix(d.other_renewables_smoothed));
            const line_other_fossil_fuels  = d3.line()
                .x(d => xScaleFuelMix(d.Date))
                .y(d => yScaleFuelMix(d.other_fossil_fuels_smoothed));

            // Create SVG for priceGraph
            const svgPrice = d3.select("#priceGraph")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            // Create scales for PriceGraph
            const xScalePrice = d3.scaleTime().range([0, width]);
            const yScalePrice = d3.scaleLinear().range([height, 0]);
            // Create line generators for PriceGraph
            const line_coal = d3.line()
                .x(d => xScalePrice(d.Date))
                .y(d => yScalePrice(d.coal_price));
            const line_ura = d3.line()
                .x(d => xScalePrice(d.Date))
                .y(d => yScalePrice(d.ura_price));
            const line_d = d3.line()
                .x(d => xScalePrice(d.Date))
                .y(d => yScalePrice(d.dprice));
    
            // Common code for both graphs
            const color = d3.scaleOrdinal(d3.schemeCategory10);
    
            // Set domains for loadGraph scales
            xScaleLoad.domain(d3.extent(data, d => d.Date));
            yScaleLoad.domain([0, d3.max(data, d => d.total)]);
            // Set domains for weatherGraph scales
            xScaleWeather.domain(d3.extent(data, d => d.Date));
            yScaleWeather.domain([0, d3.max(data, d => Math.max(d.tempmax, d.tempmin, d.temp))]);
            // Set domains for fuelMixGraph scales
            xScaleFuelMix.domain(d3.extent(data, d => d.Date));
            yScaleFuelMix.domain([0, d3.max(data, d => Math.max(d.dual_fuel, d.hydro, d.natural_gas, d.nuclear, d.wind, d.other_renewables, d.other_fossil_fuels))]);
            // Set domains for priceGraph scales
            xScalePrice.domain(d3.extent(data, d => d.Date));
            yScalePrice.domain([0, d3.max(data, d => Math.max(d.coal_price, d.ura_price, d.dprice))]);
    
            // Add axes for loadGraph
            svgLoad.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScaleLoad))
                .append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Date");
            svgLoad.append("g")
                .call(d3.axisLeft(yScaleLoad))
                .append("text")
                .attr("x", 0) // Position at the beginning of the axis
                .attr("y", -10) // Adjust vertical position above the axis
                .attr("dy", "0.32em")
                .attr("fill", "#000")
                .style("font-size", "16px") // Increased font size
                .style("text-anchor", "start") // Align text to the start of the axis
                .text("Load (kWh)");
            // Add line and legend for loadGraph
            svgLoad.append("path")
                .data([data])
                .attr("class", "line-load")
                .style("stroke", color(2)) // Change index if needed
                .style("fill", "none")
                .attr("d", lineTotalLoad);
            svgLoad.append("text")
                .attr("x", width - 20)
                .attr("y", 10)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(2)) // Change index if needed
                .text("Total Load");
            svgLoad.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - (margin.top /3))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Load Over Time");
    
            // Add axes for weatherGraph
            svgWeather.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScaleWeather))
                .append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Date");
            svgWeather.append("g")
                .call(d3.axisLeft(yScaleWeather))
                .append("text")
                .attr("x", 0) // Position at the beginning of the axis
                .attr("y", -10) // Adjust vertical position above the axis
                .attr("dy", "0.32em")
                .attr("fill", "#000")
                .style("font-size", "14px") // Increased font size
                .style("text-anchor", "start") // Align text to the start of the axis
                .text("Temperature (F)");
            // Add lines and legend for weatherGraph
            svgWeather.append("path")
                .data([data])
                .attr("class", "line-tempmax")
                .style("stroke", color(3))
                .style("fill", "none")
                .attr("d", lineTempMax);
            svgWeather.append("path")
                .data([data])
                .attr("class", "line-tempmin")
                .style("stroke", color(4))
                .style("fill", "none")
                .attr("d", lineTempMin);
            svgWeather.append("path")
                .data([data])
                .attr("class", "line-temp")
                .style("stroke", color(5))
                .style("fill", "none")
                .attr("d", lineTemp);
            svgWeather.append("text")
                .attr("x", width - 20)
                .attr("y", 310)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(3))
                .text("Max Temperature");
            svgWeather.append("text")
                .attr("x", width - 20)
                .attr("y", 330)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(4))
                .text("Min Temperature");
            svgWeather.append("text")
                .attr("x", width - 20)
                .attr("y", 350)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(5))
                .text("Temperature");
            svgWeather.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Temperature Over Time");
    
            // Add axes for fuelMixGraph
            svgFuelMix.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScaleFuelMix))
                .append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Date");
            svgFuelMix.append("g")
                .call(d3.axisLeft(yScaleFuelMix))
                .append("text")
                .attr("x", 0) // Position at the beginning of the axis
                .attr("y", -10) // Adjust vertical position above the axis
                .attr("dy", "0.32em")
                .attr("fill", "#000")
                .style("font-size", "14px") // Increased font size
                .style("text-anchor", "start") // Align text to the start of the axis
                .text("Percentage (%)");
            // Add lines and legend for fuelMixGraph
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-dual_fuel")
                .style("stroke", color(6))
                .style("fill", "none")
                .attr("d", line_dual_fuel);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-hydro")
                .style("stroke", color(7))
                .style("fill", "none")
                .attr("d", line_hydro);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-natural_gas")
                .style("stroke", color(8))
                .style("fill", "none")
                .attr("d", line_natural_gas);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-nuclear")
                .style("stroke", color(9))
                .style("fill", "none")
                .attr("d", line_nuclear);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-wind")
                .style("stroke", color(10))
                .style("fill", "none")
                .attr("d", line_wind);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-other_renewables")
                .style("stroke", color(11))
                .style("fill", "none")
                .attr("d", line_other_renewables);
            svgFuelMix.append("path")
                .data([data])
                .attr("class", "line-other_fossil_fuels")
                .style("stroke", color(12))
                .style("fill", "none")
                .attr("d", line_other_fossil_fuels);
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 10)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(6))
                .text("Dual Fuel");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 30)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(7))
                .text("Hydro");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 50)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(8))
                .text("Natural Gas");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 70)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(9))
                .text("Nuclear");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 90)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(10))
                .text("Wind");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 110)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(11))
                .text("Other Renewables");
            svgFuelMix.append("text")
                .attr("x", width - 20)
                .attr("y", 130)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(12))
                .text("Other Fossil Fuels");
            svgFuelMix.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - (margin.top / 4))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Generation Ratio Over Time");
    
            // Add axes for priceGraph
            svgPrice.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScalePrice))
                .append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Date");
            svgPrice.append("g")
                .call(d3.axisLeft(yScalePrice))
                .append("text")
                .attr("x", 0) // Position at the beginning of the axis
                .attr("y", -10) // Adjust vertical position above the axis
                .attr("dy", "0.32em")
                .attr("fill", "#000")
                .style("font-size", "16px") // Increased font size
                .style("text-anchor", "start") // Align text to the start of the axis
                .text("Price");

            // Add lines and legend for PriceGraph
            svgPrice.append("path")
                .data([data])
                .attr("class", "line-coal")
                .style("stroke", color(13))
                .style("fill", "none")
                .attr("d", line_coal);
            svgPrice.append("path")
                .data([data])
                .attr("class", "line-ura")
                .style("stroke", color(14))
                .style("fill", "none")
                .attr("d", line_ura);
            svgPrice.append("path")
                .data([data])
                .attr("class", "line-d")
                .style("stroke", color(17))
                .style("fill", "none")
                .attr("d", line_d);
            svgPrice.append("text")
                .attr("x", width - 20)
                .attr("y", 10)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(13))
                .text("Coal");
            svgPrice.append("text")
                .attr("x", width - 20)
                .attr("y", 30)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(14))
                .text("Uranium");
            svgPrice.append("text")
                .attr("x", width - 20)
                .attr("y", 50)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(17))
                .text("Electricity");
            svgPrice.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Energy Price Over Time");
    
        }).catch(function (error) {
            console.log("Error reading the CSV file: " + error);
        });
    
        d3.csv(csvResult).then(function (data) {
            const parseDate = d3.timeParse("%Y-%m-%d");
            data.forEach(function (d) {
                d.Date = parseDate(d.Date);
                d.actual = +d["real"]; 
                d.predicted = +d["pred"]; 
            });
            const margin = { top: 20, right: 20, bottom: 60, left: 50 };
            const width = 1500 - margin.left - margin.right;
            const height = 500 - margin.top - margin.bottom;
    
            // Create SVG for predictionGraph
            const svgPrediction = d3.select("#predictionGraph")
                .append("svg")
                .attr("width", width + margin.left + margin.right)
                .attr("height", height + margin.top + margin.bottom)
                .append("g")
                .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
            // Create scales for predictionGraph
            const xScalePrediction = d3.scaleTime().range([0, width]);
            const yScalePrediction = d3.scaleLinear().range([height, 0]);
            // Create line generators for predictionGraph
            const lineActual = d3.line()
                .x(d => xScalePrediction(d.Date))
                .y(d => yScalePrediction(d.actual));
            const linePredicted = d3.line()
                .x(d => xScalePrediction(d.Date))
                .y(d => yScalePrediction(d.predicted));
    
            // Common code for both graphs
            const color = d3.scaleOrdinal(d3.schemeCategory10);
    
            // Set domains for predictionGraph scales
            xScalePrediction.domain(d3.extent(data, d => d.Date));
            yScalePrediction.domain([0, d3.max(data, d => Math.max(d.actual, d.predicted))]);
    
            // Add axes for predictionGraph
            svgPrediction.append("g")
                .attr("transform", "translate(0," + height + ")")
                .call(d3.axisBottom(xScalePrediction)
                .tickFormat(d3.timeFormat("%Y-%m-%d")) // Format the date as "Year-Month-Day"
                .ticks(d3.timeDay.every(16)) // Adjust tick interval to every day               
                )
                .append("text")
                .attr("x", width / 2)
                .attr("y", margin.bottom - 10)
                .attr("dy", "0.71em")
                .attr("fill", "#000")
                .text("Date");
            svgPrediction.append("g")
                .call(d3.axisLeft(yScalePrediction))
                .append("text")
                .attr("x", 0) // Position at the beginning of the axis
                .attr("y", -10) // Adjust vertical position above the axis
                .attr("dy", "0.32em")
                .attr("fill", "#000")
                .style("font-size", "14px") // Increased font size
                .style("text-anchor", "start") // Align text to the start of the axis
                .text("Price ($/MWh)");  
            // Add lines and legend for predictionGraph
            svgPrediction.append("path")
                .data([data])
                .attr("class", "line")
                .style("stroke", color(0))
                .style("fill", "none")
                .attr("d", lineActual);
            svgPrediction.append("path")
                .data([data])
                .attr("class", "line-next")
                .style("stroke", color(1))
                .style("fill", "none")
                .attr("d", linePredicted);
            svgPrediction.append("text")
                .attr("x", width - 20)
                .attr("y", 10)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(0))
                .text("Actual Price");
            svgPrediction.append("text")
                .attr("x", width - 20)
                .attr("y", 30)
                .attr("dy", "0.32em")
                .attr("text-anchor", "end")
                .style("fill", color(1))
                .text("Predicted Price");
            svgPrediction.append("text")
                .attr("x", width / 2)
                .attr("y", 0 - (margin.top / 3))
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .text("Price Over Time");
        }).catch(function (error) {
            console.log("Error reading the CSV file: " + error);
        });
            
        
        d3.csv(csvPrediction).then(function (data) {
            // Extract the first row's price value
            var predictedPrice = parseFloat(data[0].Price).toFixed(2);
    
            // Update the HTML element with the predicted price
            document.getElementById("predictedPrice").textContent = predictedPrice + " USD per MWH";
        }).catch(function (error) {
            console.log("Error reading the CSV file: " + error);
        });
        var predictedPriceElement = document.getElementById("predictedPrice");
        predictedPriceElement.textContent = predictedPrice + " USD per MWH";
        predictedPriceElement.style.color = "#28a745"; // Green color
        predictedPriceElement.style.fontWeight = "bold";

      
    });
