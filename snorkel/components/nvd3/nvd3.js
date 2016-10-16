
function drawYLine(chart, svg, line) {
  var yScale = chart.yAxis.scale();
  var yValue = line.value;
  var margin = chart.margin();
  var width = $(chart.container).width();
  var height = $(chart.container).height();

  d3.select(svg).append("text")
    .attr("x", width - margin.right)
    .attr("y", margin.top + yScale(yValue))
    .classed("plotline_text", true)
    .attr("style", "font-size: 10px")
    .text(function(d) { return line.label.text});

  d3.select(svg).append("line")
      .style("stroke", line.color)
      .style("stroke-width", line.width || "2.5px")
      .classed("plotline", true)
      .on("mouseover", line.events && line.events.mouseover)
      .attr("x1", margin.left)
      .attr("y1", margin.top + yScale(yValue))
      .attr("x2", margin.left + width - margin.right)
      .attr("y2", margin.top + yScale(yValue))
      .append("text")
        .text(function(d) { return line.label&& line.label.text});



}

function drawXLine(chart, svg, line) {
  var xScale = chart.xAxis.scale();
  var xValue = line.value;
  var margin = chart.margin();
  var width = $(chart.container).width();
  var height = $(chart.container).height();

  d3.select(svg).append("text")
    .attr("x", margin.left + xScale(xValue) + 5)
    .attr("y", margin.top + 10)
    .classed("plotline_text", true)
    .attr("style", "writing-mode: tb; font-size: 10px")
    .text(function(d) { return line.label && line.label.text});

  d3.select(svg).append("line")
      .style("stroke", line.color)
      .style("stroke-width", line.width || "2.5px")
      .classed("plotline", true)
      .on("mouseover", line.events && line.events.mouseover)
      .attr("x1", margin.left + xScale(xValue))
      .attr("y1", margin.top)
      .attr("x2", margin.left + xScale(xValue))
      .attr("y2", margin.top + height - margin.bottom - 100)
      .append("text")
        .text(function(d) { return line.label && line.label.text});




}

function formatWithSampleCount(d, i, p) {
  if (p) {
    var samples = p.samples;
    if (p.data && p.data.samples) {
      samples = p.data.samples;
    }
    if (p.point && p.point.samples) {
      samples = p.point.samples;
    }

    if (_.isUndefined(samples)) {
      return parseInt(d) + " (no samples)";
    }

    return "<b>" + d + "</b>" + " <i class='light'>(" + samples + " samples)</i>";
  }

  return d;
}

module.exports = {
  tagName: "div",
  className: "",
  defaults: {
    content: "default content"
  },
  client: function(highcharts_options) {
    console.log("INITIALIZING NVD3 WITH DATA", highcharts_options);
    var self = this;
    var chartType = highcharts_options.chart.type;
    var legend = true;
    if (!_.isUndefined(highcharts_options.legend)) {
      legend = highcharts_options.legend.enabled;
    }

    var show_x = true, show_y = true;
    var skip_zero_values = false;

    if (highcharts_options.yAxis) {
      var show_y_axis = highcharts_options.yAxis.enabled;
      if (!_.isUndefined(show_y_axis)) {
        show_y = show_y_axis
      } else {
        if (highcharts_options.yAxis.labels) {
          show_y_axis = highcharts_options.yAxis.labels.enabled;
        }

        if (!_.isUndefined(show_y_axis)) {
          show_y = show_y_axis;
        }
      }
    }

    _.each(highcharts_options.series, function(s)  {
      s.values = s.data;
      if (!s.key) {
        s.key = s.name;
      }

      // customizations for display!
      s.strokeWidth = 2;
      if (s.dashStyle) {
        s.key += " (compare)";
        s.classed = 'dashed';
      }

      delete s.data;


      if (chartType == 'bar' || chartType == 'column') {
        var categories = highcharts_options.xAxis.categories;

        _.each(s.values, function(v,i) {
          v.series = i;
          v.x = categories[i];
        });

      }
    });

    var customTimeFormat = function(d) {
      return innerFormat(new Date(d));
    };

    var innerFormat = d3.time.format.multi([
      ["%I:%M", function(d) { return d.getMinutes(); }],
      ["%I %p", function(d) { return d.getHours(); }],
      ["%a %d", function(d) { return d.getDay() && d.getDate() != 1; }],
      ["%b %d", function(d) { return d.getDate() != 1; }],
      ["%B", function(d) { return d.getMonth(); }],
      ["%Y", function() { return true; }]
    ]);

    var lightFormat = d3.time.format.multi([
      ["%a %d %I:%M %p", function() { return true; }]
    ]);

    function bar_chart() {
      if (highcharts_options.series.length > 1) {
        return nv.models.multiBarChart()
          .reduceXTicks(true)
          .staggerLabels(true);
      }

      var show_labels = highcharts_options.series[0].length < 15;
      legend = false;
      return nv.models.discreteBarChart()
        .rotateLabels(70)
        .showXAxis(show_labels)

    }

    var svg = self.$el.find("svg")[0];
    // now we need to switch on chart types
    nv.addGraph(function() {
      var CHARTS = {
      'line' : function() {
        skip_zero_values = true;
        var chart = nv.models.lineChart()
          .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!

        chart.xAxis
          .showMaxMin(true)
          // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
          .ticks(10)
          .tickPadding(10);

        chart.x2Axis
          .showMaxMin(true);

      return chart;
      },
      'time' : function() {
        var chart = nv.models.lineWithFocusChart()
          .useInteractiveGuideline(true)  //We want nice looking tooltips and a guideline!
          .xScale(d3.time.scale());

        console.dir(chart);
        chart.dispatch.on("renderEnd", drawPlotLines);

        chart.interactiveLayer.tooltip.valueFormatter(formatWithSampleCount)

        chart.xAxis
          .showMaxMin(false)
          // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
          .ticks(10)
          .tickFormat(customTimeFormat)
          .tickPadding(10);

        chart.x2Axis
          .showMaxMin(false)
          .ticks(10)
          .tickPadding(10)
          .tickFormat(customTimeFormat);

      return chart;
      },
      'time_scatter' : function() {
        legend = false;
        var chart = nv.models.scatterChart()
          .interactiveUpdateDelay(0)
          .pointRange([100, 150])
          .color(function(d, i) {
            return d.color || d3.scale.category10()[(i||0) % 10] })
          .xScale(d3.time.scale())

        chart.scatter.dispatch.on("elementClick", function(e) {
          var details = "<pre class='sample_details'>" + JSON.stringify(e.point.result, null, 2) + "</pre>";
          $C("modal", {title: "Sample details", body: details}, function(modal) {
            modal.show();
          });
        });

        chart.tooltip.contentGenerator(function (obj) {
          var htmlEl = $("<div />");
          // TODO: fix to print the proper timestamp
          htmlEl.append("<b>" + obj.point.name + "</b>");
          return htmlEl.html();
        })

        chart.xAxis
          .tickFormat(customTimeFormat);
        chart.xAxis.ticks(5);
        chart.pointShape("triangle-down");

        return chart;

      },
      'scatter' : function() {
        legend = highcharts_options.legend.enabled;

        var chart = nv.models.scatterChart()
          .interactiveUpdateDelay(100)
          .duration(100)
          chart.pointShape("diamond")
          .pointRange([45, 50]);

        chart.scatter.dispatch.on("elementClick", function(e) {
          var details = "<pre class='sample_details'>" + JSON.stringify(e.point.result, null, 2) + "</pre>";
          $C("modal", {title: "Sample details", body: details}, function(modal) {
            modal.show();
          });
        });

        chart.xAxis.ticks(5);

	return chart;

      },
      'area' : function() {
	var chart = nv.models.stackedAreaChart()
          .xScale(d3.time.scale())
          .useInteractiveGuideline(true);

          chart.interactiveLayer.tooltip.valueFormatter(formatWithSampleCount)

          chart.xAxis
            .showMaxMin(false)
            // .rotateLabels(-45) // Want longer labels? Try rotating them to fit easier.
            .tickFormat(function(d) { return customTimeFormat(new Date(d)); })
            .tickPadding(10);

	return chart;
      },
      'bar' : bar_chart,
      'column' : bar_chart
      }
      chartCB = CHARTS[chartType] || CHARTS.line;

      var chart = chartCB();
      chart.duration(0);

      chart
        .showLegend(legend)       //Show the legend, allowing users to turn on/off line series.
        .x(function(d) {
          return d.x || d[0] || 0;
        })
        .y(function(d) {
          return d.y || d[1] || 0;
        })

      if (skip_zero_values) {
        chart
          .defined(function(d) {
            if ((d.y || d[1]) == 0) {
              return false;
            }

            return true;
          })
      }

      chart
        .showYAxis(show_y)        //Show the y-axis
        .showXAxis(show_x)        //Show the x-axis

      if (show_y) {
        chart.yAxis     //Chart y-axis settings
          .tickFormat(d3.format('.02f'));
      }

      if (highcharts_options.xAxis && highcharts_options.xAxis.min) {
        chart.forceX([highcharts_options.xAxis.min, highcharts_options.xAxis.max]);
      }
      if (highcharts_options.yAxis && highcharts_options.yAxis.min) {
        chart.forceY([highcharts_options.yAxis.min, highcharts_options.yAxis.max]);
      }

      // here chart is your nvd3 model

      /* Done setting the chart up? Time to render it!*/
      var myData = highcharts_options.series;

      var width = 1000;
      var height = 500;
      if (highcharts_options.width || highcharts_options.chart.width) {width = highcharts_options.width || highcharts_options.chart.width;}
      if (highcharts_options.height || highcharts_options.chart.height) {height = highcharts_options.height || highcharts_options.chart.height;}

      var container_width = $(self.$el).width();
      var container_height = $(self.$el).height();

      if (container_width < width) { width = container_width; }

      if (container_height < container_height) { height = container_height; }

      d3.select(svg)
        .style({width: width, height: height});

      d3.select(svg)
        .datum(myData)
        .call(chart)

      function drawPlotLines() {
        self.$el.find(".plotline, .plotline_text").remove();
        if (highcharts_options.yAxis && highcharts_options.yAxis.plotLines) {
          _.each(highcharts_options.yAxis.plotLines, function(pl) {
            drawYLine(chart, svg, pl);
          });
        }
        if (highcharts_options.xAxis && highcharts_options.xAxis.plotLines) {
          _.each(highcharts_options.xAxis.plotLines, function(pl) {
            drawXLine(chart, svg, pl);
          });
        }
      }

      drawPlotLines();
      //Update the chart when window resizes.
      nv.utils.windowResize(function() {
        var container_width = $(self.$el).width();
        var container_height = $(self.$el).height();

        chart.width(container_width);
        chart.height(container_height);

        d3.select(svg)
          .style({width: container_width, height: container_height});

        // Draw new plot lines onto chart
        chart.update();
        drawPlotLines();
      });
      return chart;
    });

  }
};