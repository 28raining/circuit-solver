import ReactECharts from "echarts-for-react";

const MyEChartsPlot = ({ freq_new, mag_new }) => {
  const option = {
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: "cross",
        crossStyle: {
          color: "#aaa",
        },
      },
      formatter: function (params) {
        // params is an array of points (since trigger is 'axis')
        const point = params[0]; // only one series in this case

        const freq = point.value[0];
        const amp = point.value[1];

        let freqStr = "";
        if (freq >= 1e9) freqStr = (freq / 1e9).toFixed(3) + " GHz";
        else if (freq >= 1e6) freqStr = (freq / 1e6).toFixed(3) + " MHz";
        else if (freq >= 1e3) freqStr = (freq / 1e3).toFixed(3) + " kHz";
        else freqStr = freq.toFixed(2) + " Hz";

        return `
      <strong>Frequency:</strong> ${freqStr}<br/>
      <strong>Amplitude:</strong> ${amp.toPrecision(6)} dB
    `;
      },
    },
    xAxis: {
      min: freq_new[0], // set your desired min frequency (Hz)
      max: freq_new[freq_new.length - 1], // set your desired max frequency (Hz)
      type: "log",
      name: "freq (Hz)",
      minorSplitLine: {
        show: true,
      },
      axisLabel: {
        formatter: function (value) {
          if (value >= 1e9) return (value / 1e9).toFixed(2) + "G";
          if (value >= 1e6) return (value / 1e6).toFixed(2) + "M";
          if (value >= 1e3) return (value / 1e3).toFixed(2) + "k";
          return value.toFixed(2);
        },
      },
    },
    yAxis: {
      type: "value",
      name: "amplitude (dB)",
    },
    series: [
      {
        data: freq_new.map((x, i) => [x, mag_new[i]]),
        type: "line",
        // showSymbol: false, // no markers
        smooth: false,
        lineStyle: {
          width: 2,
        },
      },
    ],
    // grid: {
    //   top: 10,
    //   left: 50,
    //   right: 20,
    //   bottom: 40
    // },
    // toolbox: {
    //   feature: {
    //     dataZoom: { yAxisIndex: "none" },
    //     restore: {},
    //     saveAsImage: {}
    //   }
    // },
    // dataZoom: [
    //   {
    //     type: "inside",
    //     xAxisIndex: 0
    //   }
    // ]
  };

  return <ReactECharts option={option} style={{ width: "100%", height: "400px" }} />;
};

export default MyEChartsPlot;
