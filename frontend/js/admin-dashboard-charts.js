$(function () {
  const data = window.dashboardChartsData || {};
  const canRenderCharts = typeof Chart !== 'undefined';
  let chartsInitialized = false;

  function getToken() {
    return sessionStorage.getItem('token') || '';
  }

  function apiGet(url) {
    return $.ajax({
      method: 'GET',
      url,
      dataType: 'json',
      headers: {
        Authorization: 'Bearer ' + getToken(),
      },
    });
  }

  function showChartMessage(canvasId, message) {
    const canvas = document.getElementById(canvasId);

    if (!canvas) {
      return;
    }

    $(canvas).addClass('hidden');

    const card = canvas.closest('.chart-card');

    if (!card) {
      return;
    }

    let messageElement = card.querySelector('.chart-empty-message');

    if (!messageElement) {
      messageElement = document.createElement('p');
      messageElement.className = 'table-note chart-empty-message';
      card.appendChild(messageElement);
    }

    messageElement.textContent = message;
  }

  function hasData(series) {
    return Array.isArray(series?.labels) && series.labels.length > 0 && Array.isArray(series?.values);
  }

  function buildBarChart() {
    const canvas = document.getElementById('yearlySalesBarChart');

    if (!canvas) {
      return;
    }

    if (!canRenderCharts) {
      showChartMessage('yearlySalesBarChart', 'Unable to load chart library. Please refresh the page.');
      return;
    }

    if (!hasData(data.yearlySales)) {
      showChartMessage('yearlySalesBarChart', 'No yearly sales data yet.');
      return;
    }

    new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.yearlySales.labels,
        datasets: [{
          label: 'Sales (PHP)',
          data: data.yearlySales.values,
          backgroundColor: 'rgba(15, 118, 110, 0.75)',
          borderColor: 'rgba(15, 118, 110, 1)',
          borderWidth: 1,
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });
  }

  function buildLineChart() {
    const canvas = document.getElementById('revenueLineChart');

    if (!canvas) {
      return;
    }

    if (!canRenderCharts) {
      showChartMessage('revenueLineChart', 'Unable to load chart library. Please refresh the page.');
      return;
    }

    if (!hasData(data.revenueByMonth)) {
      showChartMessage('revenueLineChart', 'No monthly revenue data yet.');
      return;
    }

    new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.revenueByMonth.labels,
        datasets: [{
          label: 'Revenue (PHP)',
          data: data.revenueByMonth.values,
          fill: true,
          tension: 0.3,
          backgroundColor: 'rgba(124, 58, 237, 0.18)',
          borderColor: 'rgba(124, 58, 237, 1)',
          pointBackgroundColor: 'rgba(124, 58, 237, 1)',
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  function generatePalette(size) {
    const colors = [];

    for (let i = 0; i < size; i += 1) {
      const hue = Math.round((360 / Math.max(size, 1)) * i);
      colors.push(`hsla(${hue}, 72%, 52%, 0.78)`);
    }

    return colors;
  }

  function buildPieChart() {
    const canvas = document.getElementById('productSalesPieChart');

    if (!canvas) {
      return;
    }

    if (!canRenderCharts) {
      showChartMessage('productSalesPieChart', 'Unable to load chart library. Please refresh the page.');
      return;
    }

    if (!hasData(data.productSales)) {
      showChartMessage('productSalesPieChart', 'No product sales data yet.');
      return;
    }

    const chartColors = generatePalette(data.productSales.labels.length);

    new Chart(canvas, {
      type: 'pie',
      data: {
        labels: data.productSales.labels,
        datasets: [{
          data: data.productSales.values,
          backgroundColor: chartColors,
          borderColor: chartColors.map((color) => color.replace('0.78', '1')),
          borderWidth: 1,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
      },
    });
  }

  function initializeChartsOnce() {
    if (chartsInitialized) {
      return;
    }

    buildBarChart();
    buildLineChart();
    buildPieChart();
    chartsInitialized = true;
  }

  function loadChartsFromApi() {
    return $.when(
      apiGet('/api/v1/dashboard/sales-chart'),
      apiGet('/api/v1/dashboard/items-chart'),
      apiGet('/api/v1/dashboard/users-chart')
    ).done(function (salesResponse, itemsResponse, usersResponse) {
      const salesRows = salesResponse[0].rows || [];
      const itemRows = itemsResponse[0].rows || [];
      const userRows = usersResponse[0].rows || [];

      data.yearlySales = data.yearlySales || {};
      data.revenueByMonth = {
        labels: salesRows.map((item) => item.month),
        values: salesRows.map((item) => item.total),
      };
      data.productSales = {
        labels: itemRows.map((item) => item.items),
        values: itemRows.map((item) => item.total),
      };
      data.userStatus = {
        labels: userRows.map((item) => item.status),
        values: userRows.map((item) => item.total),
      };

      if (!hasData(data.yearlySales)) {
        data.yearlySales = data.revenueByMonth;
      }
    });
  }

  function setupChartsToggle() {
    const $toggleButton = $('#toggleChartsBtn');
    const $chartsSection = $('#dashboardCharts');

    if (!$toggleButton.length || !$chartsSection.length) {
      initializeChartsOnce();
      return;
    }

    $toggleButton.on('click', function () {
      const willShow = $chartsSection.hasClass('hidden');

      $chartsSection.toggleClass('hidden', !willShow);
      $toggleButton.attr('aria-expanded', String(willShow));
      $toggleButton.text(willShow ? 'Hide Charts' : 'Charts');

      if (willShow) {
        loadChartsFromApi().always(initializeChartsOnce);
      }
    });
  }

  loadChartsFromApi().always(setupChartsToggle);
});
