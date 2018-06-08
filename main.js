var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height"),
    marginTop = 100,
    marginLeft = 100,
    innerWidth = width - marginLeft * 2,
    innerHeight = height - marginTop * 1.5;

var g = svg.append("g")
    .attr("transform", "translate(" + marginLeft + "," + marginTop + ")");
var gItemsBack = g.append("g"),
    gItems = g.append("g"),
    gAxes = g.append("g");

var sample,
    axes;

d3.csv("ABBREV.csv").then(data => {
    getSample(data, 100, 5);
    parseSample();
    creatScales();
    putAxes();
    putPolylines();
});

function getSample(data, interval1, interval2) {
    sample = [];
    var columns = data.columns;
    for (var i = 0; i < data.length; i += interval1) {
        var dataPoint = {};
        for (var j = 0; j < columns.length; j += interval2) {
            dataPoint[columns[j]] = data[i][columns[j]];
        }
        sample.push(dataPoint);
    }

    axes = [];
    for (var attr in sample[0]) {
        axes.push({
            name: attr
        });
    }
}

function parseSample() {
    axes.forEach(axis => {
        var attr = axis.name;
        for (var i = 0; i < sample.length; i++) {
            var item = sample[i];
            if (item[attr]) {
                axis.type = (isNaN(parseFloat(item[attr]))) ?
                    "string" :
                    "number";
                break;
            }
        }
    });

    axes.forEach(axis => {
        var attr = axis.name;
        if (axis.type == "number") {
            sample.forEach(item => {
                item[attr] = parseFloat(item[attr]);
                if (isNaN(item[attr])) {
                    item[attr] = 0;
                }
            });
        }
    });
}

function creatScales() {
    var numTicks = 10;
    axes.forEach(axis => {
        var attr = axis.name;
        if (axis.type == "number") {
            axis.scale = d3.scaleLinear()
                .domain([d3.min(sample, d => d[attr]), d3.max(sample, d => d[attr])])
                .range([innerHeight, 0]);
        } else {
            axis.scale = d3.scaleOrdinal()
                .domain(d3.range(sample.length))
                .range(sample.map(d => d[attr]));
        }
        axis.axis = d3.axisLeft().scale(axis.scale).ticks(numTicks);
    })
}

function putAxes() {
    var dw = innerWidth / (axes.length - 1);
    var brush = d3.brushY()
        .extent([
            [-6, 0],
            [6, innerHeight]
        ])
        .on("brush", updateFilter)
        .on("end", updateFilter);

    gAxes = gAxes.selectAll(".axis")
        .data(axes)
        .enter().append("g")
        .attr("class", "axis")
        .attr("transform", (d, i) => "translate(" + [dw * i, 0] + ")");

    gAxes.append("text")
        .attr("class", "axis--name")
        .attr("transform", "rotate(-30)")
        .attr("x", 5)
        .text(d => d.name);

    gAxes.each(function (d) {
        d3.select(this).call(d.axis);
        d3.select(this).call(brush);
    }); //??? why need function
}

function putPolylines() {
    var dw = innerWidth / (axes.length - 1);
    var line = d3.line().x((d, i) => i * dw).y((d, i) => axes[i].scale(d));

    //items
    gItemsBack = gItemsBack.selectAll("path")
        .data(sample)
        .enter().append("path")
        .attr("class", "item--back")
        .attr("d", d => line(toArray(d)));

    gItems = gItems.selectAll("path")
        .data(sample)
        .enter().append("path")
        .attr("class", "item")
        .attr("d", d => line(toArray(d)));

    //axes
}

function toArray(d) {
    var arr = [];
    for (var attr in d) {
        arr.push(d[attr]);
    }
    return arr;
}

function updateFilter() {
    var extents = [];
    gAxes.nodes().forEach(n => {
        extents.push(d3.brushSelection(n));
    });
    gItems.classed("notSelected", d => {
        for (var i = 0; i < axes.length; i++) {
            var axis = axes[i];
            if (extents[i]) {
                var y = axis.scale(d[axis.name]);
                if (y < extents[i][0] || y > extents[i][1]) {
                    return true;
                }
            }
        }
        return false;
    });
}