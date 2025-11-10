// src/layouts/dashboard/data/reportsLineChartData.js

export default {
  // Chart dei Threats Discovered (usato come "sales")
  sales: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    datasets: {
      label: "Threats Discovered",
      data: [5, 8, 6, 10, 7, 9, 12, 11, 14],
    },
  },
  // Chart dei Threats Mitigated (usato come "tasks")
  tasks: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"],
    datasets: {
      label: "Threats Mitigated",
      data: [2, 4, 3, 5, 4, 6, 7, 6, 9],
    },
  },
};
