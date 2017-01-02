//Employee Mini dash solid gauge
$(document).ready(function() {  

   $('#clickdObj').click(function(){
      var id = $(this).attr('value');
      
   });

   var chart = {      
      type: 'solidgauge'
   };
   var title = {
      text: 'Current Employee Rating'   
   };
   var subtitle = {
      text: 'Source: Sebentile'
   };

   var pane = {
      center: ['50%', '85%'],
      size: '140%',
      startAngle: -90,
      endAngle: 90,
      background: {
         backgroundColor: (Highcharts.theme && Highcharts.theme.background2) || '#EEE',
         innerRadius: '60%',
         outerRadius: '100%',
         shape: 'arc'
      }
   };

   var tooltip = {
      enabled: false
   };
      
   // the value axis
   var yAxis = {
      stops: [
         [0.1, '#DF5353'], // green
         [0.5, '#DDDF0D'], // yellow
         [0.9, '#55BF3B'] // red
      ],
      lineWidth: 0,
      minorTickInterval: null,
      tickPixelInterval: 400,
      tickWidth: 0,
      title: {
         y: -70
      },
      labels: {
         y: 16
      },
	  min: 0,
      max: 5,
      title: {
         //text: 'Score'
      }
   };	  
   
   var plotOptions = {
      solidgauge: {
         dataLabels: {
            y: 5,
            borderWidth: 0,
            useHTML: true
         }
      }
   };
   
   var credits = {
      enabled: false
   };

    var exporting = {
      enabled: true
    };

   var series = [{
      name: 'Your Score',
      data: [2.3],
      dataLabels: {
         format: '<div style="text-align:center"><span style="font-size:20px;color:' +
         ((Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black') + '">{y}</span><br/>' +
         '<span style="font-size:12px;color:silver">Rating</span></div>'
      },
      tooltip: {
         valueSuffix: 'Rating'
      }
   }];
	  
   var json = {};   
   json.chart = chart; 
   json.title = title;       
   json.pane = pane; 
   json.subtitle = subtitle;
   json.tooltip = tooltip; 
   json.yAxis = yAxis; 
   json.credits = credits; 
   json.exporting = exporting;
   json.series = series;     
   $('#container-speed').highcharts(json);   
   
   
 
   
   var chartFunction = function() {
      // Speed
      var chart = $('#container-speed').highcharts();
      var point;
      var newVal;
      var inc;
      

      // RPM
      chart = $('#container-rpm').highcharts();
      if (chart) {
         point = chart.series[0].points[0];
         inc = Math.random() - 0.5;
         newVal = point.y + inc;

         if (newVal < 0 || newVal > 5) {
            newVal = point.y - inc;
         }

         point.update(newVal);
      }
   };   
   // Bring life to the dials
   setInterval(chartFunction, 2000);
});
//Overral rating : Employee
$(document).ready(function() {
   var title = {
      text: 'Overall Employee Rating '   
   };
   var subtitle = {
      text: 'Source: Sebentile'
   };
   var credits = {
      enabled: false
   };
   var xAxis = {
      categories: ['Mar-15:2013', 'Sep-14:2014', 'Mar-15:2016']
   };
   var yAxis = {
      title: {
         text: 'Overall Rating (%)'
      },
      plotLines: [{
         value: 0,
         width: 1,
         color: '#808080'
      }]
   };   

   var tooltip = {
      valueSuffix: '%'
   }

   var legend = {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
   };

   var exporting = {
      enabled: true
    };

   var series =  [
      {
         name: 'Score',
         data: [2.6, 4.2, 3.2]
      }
   ];

   var json = {};

   json.title = title;
   json.subtitle = subtitle;
   json.xAxis = xAxis;
   json.yAxis = yAxis;0
   json.exporting = exporting;
   json.credits = credits;
   json.tooltip = tooltip;
   json.legend = legend;
   json.series = series;

   $('#overral').highcharts(json);
});

/* GLOBAL Dashboard */
//Pie chart for perfomance by department
$(document).ready(function() {  
   var chart = {
       plotBackgroundColor: null,
       plotBorderWidth: null,
       plotShadow: false
   };
   var title = {
      text: 'Perfomance by Department'   
   };      
   var tooltip = {
      pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
   };
   var plotOptions = {
      pie: {
         allowPointSelect: true,
         cursor: 'pointer',
         dataLabels: {
            enabled: true,
            format: '<b>{point.name}%</b>: {point.percentage:.1f} %',
            style: {
               color: (Highcharts.theme && Highcharts.theme.contrastTextColor) || 'black'
            }
         }
      }
   };
   var series= [{
      type: 'pie',
      name: 'Department Perfomance',
      data: [
         ['IT',   45.0],
         ['Customer Service',       26.8],
         {
            name: 'Finance',
            y: 12.8,
            sliced: true,
            selected: true
         },
         ['Comms',    8.5],
         ['Human Resources',     6.2],
         ['Corporate communications',   0.7]
      ]
   }];     
      
   var json = {};   
   json.chart = chart; 
   json.title = title;     
   json.tooltip = tooltip;  
   json.series = series;
   json.plotOptions = plotOptions;
   $('#container3').highcharts(json);  
});

//Line chart for perfomance by year
$(document).ready(function() {
   var title = {
      text: 'Perfomance by Year '   
   };
   var subtitle = {
      text: 'Source: Sebentile'
   };
   var credits = {
      enabled: false
   };
   var xAxis = {
      categories: ['Mar-15:2013', 'Sep-14:2014', 'Mar-15:2016']
   };
   var yAxis = {
      title: {
         text: 'Overall Rating (%)'
      },
      plotLines: [{
         value: 0,
         width: 1,
         color: '#808080'
      }]
   };   

   var tooltip = {
      valueSuffix: '%'
   }

   var legend = {
      layout: 'vertical',
      align: 'right',
      verticalAlign: 'middle',
      borderWidth: 0
   };

   var exporting = {
      enabled: true
    };

   var series =  [
      {
         name: 'IT',
         data: [2.6, 4.2, 3.2]
      },
      {
         name: 'Customer Service',
         data: [3.9, 4.2, 4.7]
      },
      {
         name: 'Comms',
         data: [2.9, 4.5, 4.0]
      }
   ];

   var json = {};

   json.title = title;
   json.subtitle = subtitle;
   json.xAxis = xAxis;
   json.yAxis = yAxis;0
   json.exporting = exporting;
   json.credits = credits;
   json.tooltip = tooltip;
   json.legend = legend;
   json.series = series;

   $('#perfByYear').highcharts(json);
});