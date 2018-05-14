$(document).ready(function () {
    $.get("ABBREV.csv", function (csv) {
        var $svg = $("svg"),
            svg = $svg[0],
            width = $svg.attr("width"),
            height = $svg.attr("height");

        var data = $.csv.toObjects(csv),
            dataLen = data.length;

        var sample = [];
        for (var i = 0; i < dataLen; i += 100) {
            var dataPoint = {};
            var count = 0;
            for (var attr in data[i]) {
                if (count++ % 5 === 0) {
                    dataPoint[attr] = data[i][attr];
                }
            }
            sample.push(dataPoint);
        }
        var sampleLen = sample.length;

        var axes = {},
            dimension = 0;
        for (var attr in sample[0]) {
            axes[attr] = {};
            axes[attr].index = dimension++;
        }

        processSample();

        var innerSize = [width - 240, height - 150];
        var axesPos = initAxesPos().size(innerSize);
        axesPos();
        var display = initDisplay().size(innerSize);
        display();

        function processSample() {
            sample.forEach(function (item, i) {
                for (var attr in item) {
                    var axis = axes[attr];
                    var parsed = parseFloat(item[attr]);
                    if (axis.type == "number") {
                        parsed = isNaN(parsed) ? 0 : parsed;
                        item[attr] = parsed;

                        parsed += "";
                        var index = parsed.indexOf(".");
                        var accuracy;
                        if (index === -1) {
                            accuracy = 0;
                        }
                        else {
                            accuracy = parsed.substring(index + 1).length;
                        }
                        if (axis.accuracy == undefined || accuracy > axis.accuracy) {
                            axis.accuracy = accuracy;
                        }
                    }
                    else if (axis.type == undefined) {
                        if (!isNaN(parsed)) {
                            axis.type = "number";
                            item[attr] = parsed;
                            for (var k = i - 1; k >= 0; k--) {
                                sample[k][attr] = 0;
                            }
                        }
                        else if (item[attr]) {
                            axis.type = "string";
                        }
                    }
                }
            });
        }

        function initAxesPos() {
            var width,
                height;

            function axesPos() {
                //TODO
                var numTicks = 11;
                var dh = height / (numTicks - 1);
                var dw = width / (dimension - 1);

                for (var attr in axes) {
                    var axis = axes[attr];
                    axis.name = attr;
                    axis.x = dw * axis.index;
                    axis.y = 0;
                    axis.ticks = [];
                    if (axis.type == "number") {
                        var min = Infinity,
                            max = -Infinity;
                        sample.forEach(function (item) {
                            if (item[attr] > max) {
                                max = item[attr];
                            }
                            if (item[attr] < min) {
                                min = item[attr];
                            }
                        });
                        var d = (max - min) / (numTicks - 1);
                        max += d / 2;
                        // var d = (max - 0) / (numTicks - 1);
                        var temp = Math.pow(10, axis.accuracy);
                        for (var v = min; v <= max; v += d) {
                            // for (var v = 0; v <= max; v += d) {
                            axis.ticks.push({
                                pos: dh * (axis.ticks.length),
                                label: Math.round(v * temp) / temp
                            });
                        }

                        max = parseFloat(axis.ticks[axis.ticks.length - 1].label);
                        axis.scale = initScale().param(height / max);

                        function initScale() {
                            var k;
                            function scale(value) {
                                return k * value;
                            }
                            scale.param = function (_) {
                                return arguments.length ? (k = _, scale) : k;
                            }
                            return scale;
                        }
                    }
                    else {
                        axis.map = {};
                        var values = [];
                        sample.forEach(function (item) {
                            values.push(item[attr]);
                        });
                        values.sort(function (a, b) { return a.localeCompare(b); });
                        var dh2 = height / (values.length - 1);
                        values.forEach(function (value, index) {
                            axis.ticks.push({ pos: dh2 * index, label: value });
                            axis.map[value] = dh2 * index;
                        });
                        // axis.scale = function (value) {
                        //     return axis.map[value];
                        // }

                        axis.scale = initScale2().map(axis.map);
                        function initScale2() {
                            var map;
                            function scale(value) {
                                return map[value];
                            }
                            scale.map = function (_) {
                                return arguments.length ? (map = _, scale) : map;
                            }
                            return scale;
                        }
                    }
                }
            }
            axesPos.size = function (_) {
                return arguments.length ? (width = _[0], height = _[1], axesPos) : [width, height];
            }
            return axesPos;
        }

        function initDisplay() {
            var width,
                height;

            function display() {
                var start = null;
                $(svg)
                    .mouseup(function () {
                        start = null;
                    })
                    .mousemove(function (evt) {
                        if (start) {
                            update(evt);
                        }
                    });

                var $g = append(svg, "g")
                    .attr("transform", "translate(" + 120 + "," + 120 + ")")


                //items
                var $gItemsBack = append($g,"g");
                var $gItems = append($g, "g");
                var ys = [];
                sample.forEach(function (item, index) {
                    ys[index] = {};
                    for (var attr in item) {
                        ys[index][attr] = axes[attr].scale(item[attr]);
                    }
                    var path = "";
                    for (var attr in item) {
                        path += (axes[attr].index === 0) ? "M " : "L ";
                        path += axes[attr].x + "," + (height - ys[index][attr]);
                    }
                    append($gItemsBack, "path").attr("d", path).attr("class", "background");
                    append($gItems, "path").attr("d", path).attr("class", "foreground");
                });
                var $paths = $("path", $gItems);

                //axes
                var $gAxes = append($g, "g");

                for (var attr in axes) {
                    var axis = axes[attr],
                        $gAxis = axis.$gAxis = append($gAxes, "g")
                            .attr("id", attr)
                            .attr("transform", "translate(" + axis.x + "," + axis.y + ")");

                    //main line
                    var $lineAxis = append($gAxis, "line")
                        .attr({
                            "class": "axis",
                            x1: 0,
                            y1: 0,
                            x2: 0,
                            y2: height
                        });
                    axis.top = $lineAxis.offset().top;

                    //axis name
                    append($gAxis, "text")
                        .attr({
                            "class": "axis",
                            "transform": "rotate(" + -60 + ")"
                        })
                        .text(attr);

                    //ticks
                    var $gTicks = append($gAxis, "g");

                    axis.ticks.forEach(function (tick) {
                        var $gTick = append($gTicks, "g")
                            .attr("transform", "translate(" + 0 + "," + (height - tick.pos) + ")");
                        //tick line
                        append($gTick, "line")
                            .attr({
                                "class": "tick",
                                x1: 0,
                                y1: 0,
                                x2: -3,
                                y2: 0
                            });
                        // tick label
                        append($gTick, "text")
                            .attr({
                                "class": "tick",
                                dx: "-1em",
                                dy: "0.31em",
                                "text-anchor": "end"
                            })
                            .text(tick.label);
                    });

                    var $gSelect = axis.$gSelect = create("g").attr("class", "select");
                    axis.$selectRect = append($gSelect, "rect")
                        .attr("class", "select")
                        .attr({
                            x: -8,
                            width: 16
                        });
                    axis.$selectLine1 = append($gSelect, "line")
                        .attr({
                            "class": "select",
                            x1: -8,
                            x2: 8
                        })
                    axis.$selectLine2 = append($gSelect, "line")
                        .attr({
                            "class": "select",
                            x1: -8,
                            x2: 8
                        });
                    $("*", $gSelect)
                        .mousedown(function (evt) {
                            setStart(evt);
                        });

                    //rect
                    append($gAxis, "rect")
                        .attr({
                            "class": "axis",
                            x: -8,
                            y: 0,
                            width: 16,
                            height: height
                        })
                        .mousedown(function (evt) {
                            setStart(evt);
                        })
                        .mouseup(function (evt) {
                            if (isClick(start.evt, evt)) {
                                var axis = start.axis;
                                if (axis.$gSelect == null) {
                                    axis.$gSelect = $("g.select", axis.$gAxis).detach();
                                    axis.selection = null;
                                    filter(axis);
                                }
                            }
                        });
                }

                function update(evtEnd) {
                    var target = start.target,
                        $target = $(target),
                        axis = start.axis,
                        top = axis.top,
                        yStart = start.y,
                        yEnd = evtEnd.pageY - top;

                    if (target.tagName === "line") {
                        $target.attr({ y1: yEnd, y2: yEnd });
                    }
                    else if (target.tagName === "rect") {
                        if (target.classList.contains("axis")) {
                            axis.$selectLine1.attr({ y1: yStart, y2: yStart });
                            axis.$selectLine2.attr({ y1: yEnd, y2: yEnd });
                            if (axis.$gSelect) {
                                axis.$gSelect.appendTo(axis.$gAxis);
                                axis.$gSelect = null;
                            }
                        }
                        else if (target.classList.contains("select")) {
                            var dy = yEnd - yStart,
                                yLine1 = start.yLine1 + dy,
                                yLine2 = start.yLine2 + dy;
                            axis.$selectLine1.attr({ y1: yLine1, y2: yLine1 });
                            axis.$selectLine2.attr({ y1: yLine2, y2: yLine2 });
                        }
                    }
                    updateRect(axis);
                    // applyFilter(axis);
                    filter();

                    function updateRect(axis) {
                        var y1 = axis.$selectLine1.attr("y1"),
                            y2 = axis.$selectLine2.attr("y1");
                        var start = Math.min(y1, y2),
                            end = Math.max(y1, y2);
                        if (start < -1 || end > height + 1) return;
                        axis.$selectRect.attr({
                            y: start,
                            height: end - start
                        });
                        axis.selection = { start: start, end: end };
                    }

                    function applyFilter(axis) {
                        var attr = axis.name;
                        if (axis.selection) {
                            var start = axis.selection.start,
                                end = axis.selection.end;
                        }
                        else {
                            var start = 0,
                                end = height;
                        }
                        $paths.each(function (index, path) {
                            if (path.classList.contains("foreground")) {
                                var y = height - ys[index][attr];
                                if (y < start || y > end) {
                                    path.classList.remove("foreground");
                                }
                            }
                        });
                    }
                }

                function setStart(evt) {
                    var target = evt.target,
                        axis = axes[$(target).parentsUntil($gAxes).last().attr("id")];

                    start = {
                        target: target,
                        axis: axis,
                        y: evt.pageY - axis.top,
                        yLine1: +axis.$selectLine1.attr("y1"),
                        yLine2: +axis.$selectLine2.attr("y1"),
                        evt: evt
                    }
                }

                function isClick(evt1, evt2) {
                    return evt1.pageX === evt2.pageX && evt1.pageY === evt2.pageY;
                }

                function filter() {
                    $paths.each(function (index, path) {
                        if (!(path.classList.contains("foreground"))) {
                            path.classList.add("foreground");
                        }
                    });

                    for (var attr in axes) {
                        var axis = axes[attr];
                        if (axis.selection) {
                            var start = axis.selection.start,
                                end = axis.selection.end;
                        }
                        else {
                            var start = 0,
                                end = height;
                        }
                        $paths.each(function (index, path) {
                            if (path.classList.contains("foreground")) {
                                var y = height - ys[index][attr];
                                if (y < start-1 || y > end+1) {
                                    path.classList.remove("foreground");
                                }
                            }
                        });
                    }
                }
            }

            display.size = function (_) {
                return arguments.length ? (width = _[0], height = _[1], display) : [width, height];
            }
            return display;
        }
    });
});

function append(parent, tag) {
    var elem = create(tag);
    $(parent).append(elem);
    return $(elem);
}

function create(tag) {
    var elem = document.createElementNS("http://www.w3.org/2000/svg", tag);
    return $(elem);
}
