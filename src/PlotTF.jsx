import ReactECharts from "echarts-for-react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";

const MyEChartsPlot = ({ freq_new, mag_new, phase_new, hasResults }) => {
  // Show loading indicator if we have results but data is not yet calculated
  // (hasResults indicates results.text exists, meaning calculation is in progress)
  if (hasResults && (freq_new === null || mag_new === null || freq_new.length === 0 || mag_new.length === 0)) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "400px" }}>
        <CircularProgress />
        <Box sx={{ ml: 2 }}>Calculating transfer function...</Box>
      </Box>
    );
  }
  
  // Show no data message if arrays are empty and we don't have results
  if (!freq_new || !mag_new || freq_new.length === 0 || mag_new.length === 0) {
    return <b>No data available for plot</b>;
  }
  
  // Convert linear magnitude to dB
  const mag_db = mag_new.map((mag) => {
    if (mag > 0) {
      return 20 * Math.log10(mag);
    } else {
      return -Infinity;
    }
  });
  
  // Convert phase from radians to degrees
  const phase_deg = phase_new && phase_new.length > 0 
    ? phase_new.map((phase_rad) => (phase_rad * 180) / Math.PI)
    : [];
  
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
        // params is an array of points (one for each series)
        const freq = params[0].value[0];
        const amp = params[0].value[1];
        const phase = phase_deg.length > 0 ? params[1]?.value[1] : null;

        let freqStr = "";
        if (freq >= 1e9) freqStr = (freq / 1e9).toFixed(3) + " GHz";
        else if (freq >= 1e6) freqStr = (freq / 1e6).toFixed(3) + " MHz";
        else if (freq >= 1e3) freqStr = (freq / 1e3).toFixed(3) + " kHz";
        else freqStr = freq.toFixed(2) + " Hz";

        let tooltipContent = `
      <strong>Frequency:</strong> ${freqStr}<br/>
      <strong>Amplitude:</strong> ${amp.toPrecision(6)} dB
    `;
        if (phase !== null && phase !== undefined) {
          tooltipContent += `<br/><strong>Phase:</strong> ${phase.toPrecision(6)}°`;
        }
        return tooltipContent;
      },
    },
    xAxis: {
      min: freq_new[0], // set your desired min frequency (Hz)
      max: freq_new[freq_new.length - 1], // set your desired max frequency (Hz)
      type: "log",
      name: "freq (Hz)",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: {
        padding: [10, 0, 0, 0],
      },
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
        margin: 10,
      },
    },
    yAxis: [
      {
        type: "value",
        name: "amplitude (dB)",
        position: "left",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: {
          padding: [0, 0, 0, 0],
        },
      },
      {
        type: "value",
        name: "phase (°)",
        position: "right",
        nameLocation: "middle",
        nameGap: 50,
        nameTextStyle: {
          padding: [0, 0, 0, 0],
        },
        axisLabel: {
          margin: 12,
        },
      },
    ],
    series: [
      {
        data: freq_new.map((x, i) => [x, mag_db[i]]),
        type: "line",
        name: "Amplitude",
        yAxisIndex: 0,
        // showSymbol: false, // no markers
        smooth: false,
        lineStyle: {
          width: 2,
        },
      },
      ...(phase_deg.length > 0
        ? [
            {
              data: freq_new.map((x, i) => [x, phase_deg[i]]),
              type: "line",
              name: "Phase",
              yAxisIndex: 1,
              smooth: false,
              lineStyle: {
                width: 2,
              },
            },
          ]
        : []),
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
