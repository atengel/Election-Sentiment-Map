var authenticated = (function() {
    var xmlhttp = new XMLHttpRequest();
    var url = "/authenticated";
    xmlhttp.open("GET", url, true);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            document.getElementById('sign-in-with-twitter').style.display = 'none';
            document.getElementById('stream-tweets').style.display = 'inline';
            document.getElementById('candidate-boxes').style.display = 'inline';
            document.getElementById('instructions').style.display = 'inline';
            document.getElementById('real-time-filter-cell').style.textAlign = 'left';
        } else {
            document.getElementById('sign-in-with-twitter').style.display = 'inline';
            document.getElementById('stream-tweets').style.display = 'none';
        }
    };

    xmlhttp.send();
})();
var width = 960,
    height = 500,
    formatPercent = d3.format(".0%"),
    formatNumber = d3.format(".0f");

var projection = d3.geo.albersUsa()
    .scale(1000)
    .translate([width / 2, height / 2]);

var path = d3.geo.path()
    .projection(projection);
var div = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

var svg = d3.select("#svgCell").append("svg")
    .attr("id", "mainSvg")
    .attr("width", width)
    .attr("height", height);



d3.json("/data/us_lines2.json", function(error, us) {
  if (error) throw error;
  svg.selectAll("path")
      .data(topojson.feature(us, us.objects.states).features)
    .enter().append("path")
      .attr("d", path)
      .attr("class", "feature")
    .call(gatherResults());
      

  svg.append("path")
      .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b; }))
      .attr("class", "mesh")
      .attr("d", path);
});
//  svg.insert("path", ".graticule")
//      .datum(topojson.feature(us, us.objects.land))
//      .attr("class", "land")
//      .attr("d", path);
//
//
//  svg.insert("path", ".graticule")
//      .datum(topojson.feature(us, us.objects.states).feaut
//      .attr("class", "state-boundary")
//      .attr("d", path)
//    .style("fill", "red");
//});

d3.select(self.frameElement).style("height", height + "px");


 
// tick formatter
var formatTime = d3.time.format("%H:%M");
var formatMinutes = function(d) {
        var hours = Math.floor(d/60);
        var minutes = 1440 % 60;
        return formatTime(new Date(2012, 0, 1, hours, minutes)); 
    };


var socket = io.connect();

   socket.on('tweetData', function(data) {
    var tweetData = JSON.parse(data);
    console.log(tweetData.place.bounding_box.coordinates);
    svg.append('rect')
    .attr('class', 'tweet')
    .attr("transform", function(d) {
        return "translate(" + projection([(tweetData.place.bounding_box.coordinates[0][0][0]+tweetData.place.bounding_box.coordinates[0][2][0])/2, (tweetData.place.bounding_box.coordinates[0][0][1]+ tweetData.place.bounding_box.coordinates[0][1][1])/2]) + ")";})
    .attr('width', '4px')
    .attr('height', '4px')
    .attr('fill', function() {
        console.log(tweetData);
        if(parseFloat(JSON.parse(tweetData.sentiment).polarity) > 0) {
            return 'green';
        } else {
            return 'red';
        }
    })
    .on("mouseover", function() {      
                div.transition()        
                    .duration(200)      
                    .style("opacity", .9);      
                div.html(function() {
                        return "<b>@" + tweetData.screenname + ":</b>" + tweetData.text + "<br><br>" + tweetData.place.full_name + "<br>" + "+" + Math.round(parseFloat(JSON.parse(tweetData.sentiment).polarity)*100); 
                    } )
                    .style("left", (d3.event.pageX + 16) + "px")        
                    .style("top", (d3.event.pageY + 16) + "px")
                    .style("font-size", "12px")
                    .style("padding", "5px");    
                })                  
            .on("mouseout", function(d) {       
                div.transition()        
                    .duration(500)      
                    .style("opacity", 0);
                });
}); 


d3.select(self.frameElement).style("height", height + "px");
var tooltip = d3.select("body").append("div")   
    .attr("class", "tooltip")               
    .style("opacity", 0);

var color = d3.scale.linear()
    .domain([-1, 0, 1])
    .range(["red", "white", "green"]);
var min = -100,
    mid = 0,
    max = 100;

drawKey(min, mid, max, 300, 20);

/*
 * min: number, min datum
 * mid: number, midpoint or average
 * max: number, max datum
 * width: number, width of key
 * height: number, height of key
 */
function drawKey(min, mid, max, keyWidth, keyHeight) {
  // Scales
    var keySvg = d3.select("#keyDiv").append("svg").attr("width", keyWidth + 30).attr("height", keyHeight + 30);
  var colorRange = ['red', 'white', 'green'],
      colors = d3.scale.linear()
        .domain([min, mid, max])
        .range(colorRange),
      x = d3.scale.linear()
        .domain([min, max])
        .range([0, keyWidth]);

  // SVG defs
  var defs = svg
    .datum({min: min, mid: mid})
    .append('svg:defs')

  // Gradient defs
  var gradient1 = defs.append('svg:linearGradient')
    .attr('id', 'gradient1')
  var gradient2 = defs.append('svg:linearGradient')
    .attr('id', 'gradient2')

  // Gradient 1 stop 1
  gradient1.append('svg:stop')
    .datum({min: min})
    .attr('stop-color', function(d) { return colors(d.min) })
    .attr('offset', '0%')

  // Gradient 1 stop 2
  gradient1.append('svg:stop')
    .datum({mid: mid})
    .attr('stop-color', function(d) { return colors(d.mid) })
    .attr('offset', '100%')

  // Gradient 2 stop 1
  gradient2.append('svg:stop')
    .datum({mid: mid})
    .attr('stop-color', function(d) { return colors(d.mid) })
    .attr('offset', '0%')

  // Gradient 2 stop 2
  gradient2.append('svg:stop')
    .datum({max: max})
    .attr('stop-color', function(d) { return colors(d.max) })
    .attr('offset', '100%')

  // Gradient 1 rect
  keySvg
    .datum({min: min, mid: mid })
    .append('svg:rect')
      .attr('id', 'gradient1-bar')
      .attr('x', '15')
      .attr('fill', 'url(#gradient1)')
      .attr('width', function(d) { return x(d.mid) })
      .attr('height', keyHeight);

  // Gradient 2 rect
  keySvg
    .datum({mid: mid, max: max})
    .append('svg:rect')
      .attr('id', 'gradient2-bar')
    .attr('x', '15')
      .attr('fill', 'url(#gradient2)')
      .attr('transform', function(d) { return 'translate(' + x(d.mid) + ',0)'})
      .attr('width', function(d) { return x(d.max) - x(d.mid) })
      .attr('height', keyHeight)

  // Append axis
  var axis = d3.svg.axis()
      .scale(x)
      .tickValues([min, mid, max]);

  keySvg.append('g').attr('class', 'axis')

  keySvg.selectAll('.axis')
    .attr('transform', 'translate(15,'+(keyHeight)+')')
    .call(axis)
}
var displayResults = function(results) {
    d3.json("/data/us-states.json",function(error, json) {

// Loop through each state data value in the .csv file
    for (var key in results) {
        // Grab State Name
        var dataState = key;
        // Grab data value 
        var dataValue = results[dataState];
        // Find the corresponding state inside the GeoJSON
        for (var j = 0; j < json.features.length; j++)  {
            var jsonState = json.features[j].properties.name;
            if (dataState == jsonState) {
            // Copy the data value into the JSON
            json.features[j].properties.sentiment = dataValue; 
            // Stop looking through the JSON
            break;
            }
        }
    }
              svg.selectAll("path")
                .data(json.features)
                .attr("d", path)
                .style("fill", function(d) {
                  console.log(d.properties.sentiment);
                  return color(d.properties.sentiment);
                })
                .style("stroke", "black")
	           .style("stroke-width", "1")
                .on("mouseover", function(d) { 
                  
                div.transition()        
                    .duration(200)      
                    .style("opacity", .9);      
                div.html(function() {
                    if(results[d.properties.name]) {
                        if(results[d.properties.name] > 0.0) {
                            return d.properties.name + "<br>" + "+" + Math.round(results[d.properties.name]*100); 
                        } else {
                            return d.properties.name + "<br>" + Math.round(results[d.properties.name]*100); 
                        }
                    } else {
                        return d.properties.name + "<br>" + "No Info";
                    }
                    })
                    .style("left", (d3.event.pageX + 16) + "px")        
                    .style("top", (d3.event.pageY + 16) + "px")
                    .style("font-size", "12px");    
                })                  
            .on("mouseout", function(d) {       
                div.transition()        
                    .duration(500)      
                    .style("opacity", 0);
//        });
//    svg.selectAll(".stateData")
//        .data(data)
//        .enter()
//        .attr("class", "stateData")
//        .enter().append("rect")
//        .attr('class','stateData')
//        .attr("height", "12px")
//        .attr("width", "12px")
//        .attr("fill", function(d) {
//            return color(results[d.state]);
//        })
//        .attr("transform", function(d) {
//            console.log(d.latitude);
//            console.log("translate(" + projection([d.latitude, d.longitude]) + ")");
//            return "translate(" + projection([d.longitude, d.latitude]) + ")";
//        })

        
});
});
};

var streamTweets = function() {
    var checkedValues = []; 
    var inputElements = document.getElementsByClassName('candidateBox');
    for(var i=0; inputElements[i]; ++i){
      if(inputElements[i].checked){
           checkedValues.push(inputElements[i].value);
      }
    }
    d3.selectAll('rect.tweet').remove();
    socket.emit('close')
    socket.emit('search', JSON.stringify({'searchTerms' : checkedValues}));
    
}
var gatherResults= function() {

    var searchTerm = document.querySelector('input[name="candidate"]:checked').value;
    var xmlhttp = new XMLHttpRequest();
    var url = "/data/analyze/" +searchTerm;
    xmlhttp.open("GET", url, true);
    
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            var results = JSON.parse(xmlhttp.responseText);
            displayResults(results);
        }
    };

    xmlhttp.send();

    
};

