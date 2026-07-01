$(function () {
  function showCartMessage($message, text, isError) {
    $message.toggleClass('is-error', Boolean(isError)).text(text || '');
  }

  function filterProducts() {
    const searchText = $('#productSearch').val().toLowerCase().trim();
    const selectedCategory = $('#categoryFilter').val();
    let visibleCount = 0;

    $('.product-card').each(function () {
      const $card = $(this);
      const matchesSearch = $card.data('name').includes(searchText);
      const matchesCategory = !selectedCategory || String($card.data('category-id')) === selectedCategory;
      const shouldShow = matchesSearch && matchesCategory;

      $card.toggle(shouldShow);
      if (shouldShow) {
        visibleCount += 1;
      }
    });

    $('#emptyCatalogMessage').toggleClass('is-visible', visibleCount === 0);
  }

  function updateSuggestions() {
    const searchText = $('#productSearch').val().toLowerCase().trim();
    const $suggestions = $('#searchSuggestions');

    if (!searchText) {
      $suggestions.removeClass('is-visible').empty();
      return;
    }

    const matches = [];

    $('.product-card:visible').each(function () {
      const $card = $(this);
      const name = String($card.data('name'));

      if (name.includes(searchText)) {
        matches.push({
          label: $card.find('.product-body h2').text().trim(),
          value: name,
        });
      }
    });

    $suggestions.empty();

    matches.slice(0, 5).forEach((match) => {
      $('<button type="button"></button>')
        .text(match.label)
        .on('click', function () {
          $('#productSearch').val(match.value);
          filterProducts();
          updateSuggestions();
        })
        .appendTo($suggestions);
    });

    $suggestions.toggleClass('is-visible', matches.length > 0);
  }

  $('.product-card img, .detail-image img, .image-list img').on('error', function () {
    $(this).hide().siblings('.image-placeholder').removeClass('is-hidden');
  });

  $('#productSearch').on('input', function () {
    filterProducts();
    updateSuggestions();
  });

  $('#categoryFilter').on('change', function () {
    filterProducts();
    updateSuggestions();
  });

  $(document).on('click', function (event) {
    if (!$(event.target).closest('.search-field').length) {
      $('#searchSuggestions').removeClass('is-visible');
    }
  });

  $('.add-to-cart-form').on('submit', function (event) {
    event.preventDefault();

    const $form = $(this);
    const $message = $form.find('.cart-message');

    $.ajax({
      url: $form.attr('action'),
      method: 'POST',
      data: $form.serialize(),
      dataType: 'json',
      success: function (response) {
        showCartMessage($message, response.message || 'Added to cart.', false);
      },
      error: function (xhr) {
        const response = xhr.responseJSON || {};
        showCartMessage($message, response.message || 'Unable to add item.', true);
      }
    });
  });

  filterProducts();
});
