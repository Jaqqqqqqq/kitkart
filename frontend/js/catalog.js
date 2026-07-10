$(function () {
  const INITIAL_BATCH_SIZE = 8;
  const SCROLL_BATCH_SIZE = 6;
  const cardSelector = '.product-card';
  let observer = null;

  function showCartMessage($message, text, isError) {
    $message.toggleClass('is-error', Boolean(isError)).text(text || '');
  }

  function isLoggedIn() {
    return Boolean(sessionStorage.getItem('token') || localStorage.getItem('token'));
  }

  function getVisibleCards() {
    return $(cardSelector).filter(function () {
      return !$(this).hasClass('is-filtered-out');
    });
  }

  function countRevealedCards() {
    return getVisibleCards().filter(function () {
      return !$(this).hasClass('is-scroll-hidden');
    }).length;
  }

  function updateInfiniteScrollStatus(visibleCount) {
    const total = getVisibleCards().length;
    const $status = $('#infiniteScrollStatus');

    if (!total) {
      $status.text('');
      return;
    }

    if (visibleCount >= total) {
      $status.text(`Showing all ${total} items.`);
      return;
    }

    $status.text(`Showing ${visibleCount} of ${total} items. Scroll for more.`);
  }

  function revealNextBatch(batchSize) {
    const $hiddenCards = getVisibleCards().filter('.is-scroll-hidden').slice(0, batchSize);
    $hiddenCards.removeClass('is-scroll-hidden');

    const visibleCount = countRevealedCards();
    const total = getVisibleCards().length;
    const hasMore = visibleCount < total;

    $('#infiniteScrollSentinel').toggleClass('is-hidden', !hasMore);
    updateInfiniteScrollStatus(visibleCount);

    return hasMore;
  }

  function resetInfiniteScroll() {
    const $cards = getVisibleCards();

    $cards.addClass('is-scroll-hidden');
    $cards.slice(0, INITIAL_BATCH_SIZE).removeClass('is-scroll-hidden');

    const visibleCount = countRevealedCards();
    const total = $cards.length;
    const hasMore = visibleCount < total;

    $('#infiniteScrollSentinel').toggleClass('is-hidden', !hasMore);
    updateInfiniteScrollStatus(visibleCount);
  }

  function setupInfiniteScrollObserver() {
    if (observer) {
      observer.disconnect();
    }

    const sentinel = document.getElementById('infiniteScrollSentinel');

    if (!sentinel || !('IntersectionObserver' in window)) {
      return;
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          revealNextBatch(SCROLL_BATCH_SIZE);
        }
      });
    }, {
      root: null,
      rootMargin: '120px',
      threshold: 0,
    });

    observer.observe(sentinel);
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

      $card.toggleClass('is-filtered-out', !shouldShow);
      if (shouldShow) {
        visibleCount += 1;
      }
    });

    $('#emptyCatalogMessage').toggleClass('is-visible', visibleCount === 0);

    if (visibleCount === 0) {
      $('#infiniteScrollSentinel').addClass('is-hidden');
      $('#infiniteScrollStatus').text('');
      return;
    }

    resetInfiniteScroll();
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

    if (!isLoggedIn()) {
      showCartMessage($message, 'Please login to add items to cart.', true);
      return;
    }

    $.ajax({
      url: $form.attr('action'),
      method: 'POST',
      data: $form.serialize(),
      dataType: 'json',
      success: function (response) {
        showCartMessage($message, response.message || 'Added to cart.', false);
        if (typeof showPopup === 'function') {
          showPopup(response.message || 'Added to cart.', 'success');
        }
      },
      error: function (xhr) {
        const response = xhr.responseJSON || {};
        showCartMessage($message, response.message || 'Unable to add item.', true);
        if (typeof showPopup === 'function') {
          showPopup(response.message || 'Unable to add item.', 'error');
        }
      }
    });
  });

  if (!isLoggedIn()) {
    $('.add-to-cart-form button').prop('disabled', true).text('Login to add');
  }

  setupInfiniteScrollObserver();
  filterProducts();
});
