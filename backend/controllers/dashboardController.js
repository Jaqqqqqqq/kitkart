const adminModel = require('../models/adminModel');
const path = require('path');

function toMonthKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function toMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-');
  const date = new Date(Number(year), Number(month) - 1, 1);

  return date.toLocaleString('en-US', {
    month: 'short',
    year: 'numeric',
  });
}

function toYearKey(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return String(date.getFullYear());
}

async function getChartData() {
  const [orders, users, productSales] = await Promise.all([
    adminModel.getAllOrders(),
    adminModel.getUsers(),
    adminModel.getProductSalesSummary(),
  ]);

  const yearlySales = orders.reduce((acc, order) => {
    const yearKey = toYearKey(order.created_at);

    if (!yearKey) {
      return acc;
    }

    acc[yearKey] = (acc[yearKey] || 0) + Number(order.total || 0);
    return acc;
  }, {});

  const sortedYears = Object.keys(yearlySales).sort();

  const revenueByMonth = orders.reduce((acc, order) => {
    const monthKey = toMonthKey(order.created_at);

    if (!monthKey) {
      return acc;
    }

    acc[monthKey] = (acc[monthKey] || 0) + Number(order.total || 0);
    return acc;
  }, {});

  const sortedMonths = Object.keys(revenueByMonth).sort();

  const userStatusCounts = users.reduce((acc, user) => {
    const key = String(user.status || 'inactive').toLowerCase();
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    yearlySales: {
      labels: sortedYears,
      values: sortedYears.map((yearKey) => Number(yearlySales[yearKey].toFixed(2))),
    },
    revenueByMonth: {
      labels: sortedMonths.map(toMonthLabel),
      values: sortedMonths.map((monthKey) => Number(revenueByMonth[monthKey].toFixed(2))),
    },
    productSales: {
      labels: productSales.map((item) => item.product_name),
      values: productSales.map((item) => item.units_sold),
    },
    userStatus: {
      labels: ['Active', 'Inactive'],
      values: [Number(userStatusCounts.active || 0), Number(userStatusCounts.inactive || 0)],
    },
  };
}

function dashboard(req, res) {
  return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-dashboard.html'));
}

async function charts(req, res) {
  try {
    const chartData = await getChartData();

    return res.sendFile(path.resolve(__dirname, '..', '..', 'frontend', 'admin-charts.html'));
  } catch (error) {
    console.error(error);
    return res.status(500).send('Unable to load charts.');
  }
}

async function salesChart(req, res) {
  try {
    const orders = await adminModel.getAllOrders();
    const revenueByMonth = orders.reduce((acc, order) => {
      const monthKey = toMonthKey(order.created_at);

      if (!monthKey) {
        return acc;
      }

      acc[monthKey] = (acc[monthKey] || 0) + Number(order.total || 0);
      return acc;
    }, {});

    const labels = Object.keys(revenueByMonth).sort();

    return res.status(200).json({
      success: true,
      rows: labels.map((monthKey) => ({
        month: toMonthLabel(monthKey),
        total: Number(revenueByMonth[monthKey].toFixed(2)),
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error loading sales chart' });
  }
}

async function itemsChart(req, res) {
  try {
    const rows = await adminModel.getProductSalesSummary();

    return res.status(200).json({
      success: true,
      rows: rows.map((item) => ({
        items: item.product_name,
        total: item.units_sold,
      })),
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error loading items chart' });
  }
}

async function usersChart(req, res) {
  try {
    const users = await adminModel.getUsers();
    const counts = users.reduce((acc, user) => {
      const key = String(user.status || 'inactive').toLowerCase();
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      rows: [
        { status: 'Active', total: counts.active || 0 },
        { status: 'Inactive', total: counts.inactive || 0 },
      ],
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: 'Error loading users chart' });
  }
}

module.exports = {
  charts,
  dashboard,
  itemsChart,
  salesChart,
  usersChart,
};
