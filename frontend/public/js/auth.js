$(function () {
  function validateEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function showFieldError($field, message) {
    const $help = $field.closest('.form-field').find('.field-help');
    $help.text(message || '');
    $field.attr('aria-invalid', message ? 'true' : 'false');
  }

  $('#loginForm').on('submit', function (event) {
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
      event.preventDefault();
    }
  });

  $('#registerForm').on('submit', function (event) {
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
      event.preventDefault();
    }
  });
});
