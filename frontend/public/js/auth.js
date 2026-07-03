$(function () {
  function saveAuth(data) {
    if (data.token) {
      sessionStorage.setItem('token', data.token);
    }

    if (data.user?.id) {
      sessionStorage.setItem('userId', data.user.id);
      sessionStorage.setItem('role', data.user.role || '');
    }
  }

  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showFieldError($field, message) {
    const $help = $field.closest('.form-field').find('.field-help');
    $help.text(message || '');
    $field.attr('aria-invalid', message ? 'true' : 'false');
  }

  $('#loginForm').on('submit', function (event) {
    event.preventDefault();

    const $form = $(this);
    const email = $('#email').val().trim();
    const password = $('#password').val();
    let valid = true;

    $('.field-help').text('');

    if (!validateEmail(email)) {
      showFieldError($('#email'), 'Enter a valid email address.');
      valid = false;
    }

    if (!password) {
      showFieldError($('#password'), 'Password is required.');
      valid = false;
    }

    if (!valid) {
      return;
    }

    $.ajax({
      method: 'POST',
      url: '/api/v1/login',
      data: JSON.stringify({ email, password }),
      processData: false,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function (data) {
        saveAuth(data);
        window.location.href = data.redirectUrl || '/home';
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Login failed.';
        showFieldError($form.find('#password'), message);
      },
    });
  });

  $('#registerForm').on('submit', function (event) {
    event.preventDefault();

    const $form = $(this);
    const firstName = $('#first_name').val().trim();
    const lastName = $('#last_name').val().trim();
    const email = $('#email').val().trim();
    const password = $('#password').val();
    const confirmPassword = $('#confirm_password').val();
    let valid = true;

    $('.field-help').text('');

    if (!firstName) {
      showFieldError($('#first_name'), 'First name is required.');
      valid = false;
    }

    if (!lastName) {
      showFieldError($('#last_name'), 'Last name is required.');
      valid = false;
    }

    if (!validateEmail(email)) {
      showFieldError($('#email'), 'Enter a valid email address.');
      valid = false;
    }

    if (!password || password.length < 6) {
      showFieldError($('#password'), 'Use at least 6 characters.');
      valid = false;
    }

    if (password !== confirmPassword) {
      showFieldError($('#confirm_password'), 'Passwords must match.');
      valid = false;
    }

    if (!valid) {
      return;
    }

    $.ajax({
      method: 'POST',
      url: '/api/v1/register',
      data: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        phone: $('#phone').val().trim(),
        address: $('#address').val().trim(),
      }),
      processData: false,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function (data) {
        saveAuth(data);
        window.location.href = data.redirectUrl || '/home';
      },
      error: function (error) {
        const message = error.responseJSON?.message || 'Registration failed.';
        showFieldError($form.find('#email'), message);
      },
    });
  });
});
