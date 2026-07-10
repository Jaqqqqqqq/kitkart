$(function () {
  // Confirmation Modal Management
  let confirmCallback = null;

  function initConfirmModal() {
    const $modal = $('#confirmModal');
    if ($modal.length === 0) {
      const modalHtml = `
        <div id="confirmModal" class="confirm-modal" style="display: none;">
          <div class="confirm-modal-overlay"></div>
          <div class="confirm-modal-content">
            <p id="confirmMessage"></p>
            <div class="confirm-modal-actions">
              <button type="button" class="confirm-modal-cancel">Cancel</button>
              <button type="button" class="confirm-modal-confirm danger-button">Delete</button>
            </div>
          </div>
        </div>
      `;
      $('body').append(modalHtml);
    }
  }

  function showConfirmModal(message, callback) {
    initConfirmModal();
    const $modal = $('#confirmModal');
    $('#confirmMessage').text(message);
    confirmCallback = callback;
    $modal.show();
  }

  function closeConfirmModal() {
    $('#confirmModal').hide();
    confirmCallback = null;
  }

  $(document).on('click', '.confirm-modal-cancel', closeConfirmModal);
  $(document).on('click', '.confirm-modal-confirm', function () {
    if (confirmCallback && typeof confirmCallback === 'function') {
      confirmCallback();
    }
    closeConfirmModal();
  });

  function getToken() {
    return sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  }

  function apiAjax(options) {
    return $.ajax({
      xhrFields: { withCredentials: true },
      headers: {
        Authorization: 'Bearer ' + getToken(),
        ...(options.headers || {}),
      },
      ...options,
    });
  }

  function showToast(message, type) {
    let $toast = $('#toast');

    if (!$toast.length) {
      $toast = $('<div id="toast" class="msg-toast"></div>');
      $('body').append($toast);
    }

    $toast
      .text(message)
      .attr('class', 'msg-toast ' + type)
      .show();

    setTimeout(function () {
      $toast.hide();
    }, 3000);
  }

  function getFieldContainer($field) {
    return $field.closest('.form-field');
  }

  function showFieldError($field, message) {
    const $container = getFieldContainer($field);
    const $help = $container.find('.field-help').first();

    if ($help.length) {
      $help.text(message || '');
    }

    $field.attr('aria-invalid', message ? 'true' : 'false');
  }

  function clearFieldErrors($form) {
    $form.find('.field-help').text('');
    $form.find('[aria-invalid="true"]').attr('aria-invalid', 'false');
  }

  function validateProductForm($form) {
    const categoryId = $form.find('#category_id').val();
    const productName = $form.find('#product_name').val().trim();
    const description = $form.find('#description').val().trim();
    const priceValue = $form.find('#price').val();
    const stockQuantityValue = $form.find('#stock_quantity').val();
    const price = Number(priceValue);
    const stockQuantity = Number(stockQuantityValue);
    const hasMainImage = String($form.data('has-main-image')) === 'true' && $form.find('#remove_main_image').val() !== '1';
    const mainImageSelected = ($form.find('#main_image')[0]?.files?.length || 0) > 0;
    let valid = true;

    if (!categoryId) {
      showFieldError($form.find('#category_id'), 'This field is required.');
      valid = false;
    }

    if (!productName) {
      showFieldError($form.find('#product_name'), 'This field is required.');
      valid = false;
    }

    if (description.length > 500) {
      showFieldError($form.find('#description'), 'Description must be 500 characters or fewer.');
      valid = false;
    }

    if (priceValue === '') {
      showFieldError($form.find('#price'), 'This field is required.');
      valid = false;
    } else if (Number.isNaN(price) || price < 0) {
      showFieldError($form.find('#price'), 'Enter a valid non-negative price.');
      valid = false;
    }

    if (stockQuantityValue === '') {
      showFieldError($form.find('#stock_quantity'), 'This field is required.');
      valid = false;
    } else if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      showFieldError($form.find('#stock_quantity'), 'Enter a valid stock quantity.');
      valid = false;
    }

    if (!hasMainImage && !mainImageSelected) {
      showFieldError($form.find('#main_image'), 'This field is required.');
      valid = false;
    }

    return valid;
  }

  function validateCategoryForm($form) {
    const categoryName = $form.find('#category_name').val().trim();
    const description = $form.find('#description').val().trim();
    let valid = true;

    if (!categoryName) {
      showFieldError($form.find('#category_name'), 'Category name is required.');
      valid = false;
    }

    if (description.length > 500) {
      showFieldError($form.find('#description'), 'Description must be 500 characters or fewer.');
      valid = false;
    }

    return valid;
  }

  function enhanceDataTable(tableId, options) {
    const $table = $(tableId);

    if ($table.length && $.fn.DataTable) {
      $table.DataTable(options);
    }
  }

  $('.js-admin-form').on('submit', function (event) {
    const $form = $(this);
    clearFieldErrors($form);

    const isProductForm = $form.is('#productForm');
    const isCategoryForm = $form.is('#categoryForm');
    let isValid = true;

    if (isProductForm) {
      isValid = validateProductForm($form);
    } else if (isCategoryForm) {
      isValid = validateCategoryForm($form);
    }

    if (!isValid) {
      event.preventDefault();
      return;
    }

    if ($form.hasClass('js-api-form')) {
      event.preventDefault();

      const token = getToken();
      if (!token) {
        showToast('Authentication failed. Please login again.', 'error');
        return;
      }

      const requestMethod = $form.data('api-method') || 'POST';
      const apiUrl = $form.data('api-url');
      const isCategoryForm = $form.is('#categoryForm');

      let ajaxOptions = {
        method: requestMethod,
        url: apiUrl,
        dataType: 'json',
        success: function (data) {
          console.log('API Response:', data);
          if (!data.success) {
            showToast(data.message || 'Save failed.', 'error');
            return;
          }

          showToast(data.message || 'Saved successfully.', 'success');
          setTimeout(function () {
            window.location.href = $form.data('redirect') || '/admin/dashboard';
          }, 500);
        },
        error: function (error) {
          console.error('API Error:', error);
          const errorMessage = error.responseJSON?.message || error.statusText || 'Save failed.';
          showToast(errorMessage, 'error');
        },
      };

      // For category forms, send JSON
      if (isCategoryForm) {
        const categoryName = $form.find('#category_name').val();
        const description = $form.find('#description').val();
        
        ajaxOptions.data = JSON.stringify({
          category_name: categoryName,
          description: description,
        });
        ajaxOptions.contentType = 'application/json';
        ajaxOptions.processData = false;
        
        console.log('Category form submission:', {
          url: apiUrl,
          method: requestMethod,
          data: {category_name: categoryName, description: description},
          contentType: ajaxOptions.contentType
        });
      } else {
        // For product forms, send FormData
        ajaxOptions.data = new FormData(this);
        ajaxOptions.processData = false;
        ajaxOptions.contentType = false;
      }

      apiAjax(ajaxOptions);
    }
  });

  $(document).on('click', '.js-remove-main-image', function () {
    const $form = $(this).closest('form');
    $('#remove_main_image').val('1');
    $form.data('has-main-image', 'false');
    $(this).closest('.editable-image').addClass('is-removed');
  });

  $(document).on('click', '.js-remove-gallery-image', function () {
    const imageId = $(this).data('id');
    const $form = $(this).closest('form');

    $('<input>')
      .attr('type', 'hidden')
      .attr('name', 'remove_gallery_image_ids')
      .val(imageId)
      .appendTo($form);

    $(this).closest('.editable-image').addClass('is-removed');
  });

  $(document).on('submit', '.js-api-delete', function (event) {
    event.preventDefault();

    const $form = $(this);

    showConfirmModal('Delete this record?', function () {
      apiAjax({
        method: 'DELETE',
        url: $form.data('api-url'),
        dataType: 'json',
        success: function (data) {
          if (!data.success) {
            showToast(data.message || 'Delete failed.', 'error');
            return;
          }

          const rowSelector = $form.data('row');
          const table = $form.closest('table').DataTable();

          if (table) {
            table.row($(rowSelector)).remove().draw();
          } else {
            $(rowSelector).remove();
          }

          showToast(data.message || 'Deleted successfully.', 'success');
        },
        error: function (error) {
          console.error('Delete error:', error);
          showToast(error.responseJSON?.message || 'Delete failed.', 'error');
        },
      });
    });
  });

  enhanceDataTable('#productsTable', {
    pageLength: 10,
    lengthChange: false,
    order: [[0, 'asc']],
    columnDefs: [
      { targets: -1, orderable: false, searchable: false },
    ],
  });

  enhanceDataTable('#categoriesTable', {
    pageLength: 10,
    lengthChange: false,
    order: [[0, 'asc']],
    columnDefs: [
      { targets: -1, orderable: false, searchable: false },
    ],
  });

  enhanceDataTable('#usersTable', {
    pageLength: 10,
    lengthChange: false,
    order: [[0, 'asc']],
    columnDefs: [
      { targets: -1, orderable: false, searchable: false },
    ],
  });

  enhanceDataTable('#ordersTable', {
    pageLength: 10,
    lengthChange: false,
    order: [[0, 'desc']],
    columnDefs: [
      { targets: -1, orderable: false, searchable: false },
    ],
  });

  window.updateRole = function (userId) {
    const role = $('#role-select-' + userId).val();

    apiAjax({
      method: 'PUT',
      url: '/api/v1/users/' + userId + '/role',
      data: JSON.stringify({ role }),
      processData: false,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function (data) {
        if (data.success) {
          $('#role-cell-' + userId).text(role);
          showToast('Role updated to ' + role + '.', 'success');
          return;
        }

        showToast(data.message || 'Failed to update role.', 'error');
      },
      error: function (error) {
        showToast(error.responseJSON?.message || 'Request failed.', 'error');
      },
    });
  };

  window.updateStatus = function (userId, newStatus) {
    apiAjax({
      method: 'PUT',
      url: '/api/v1/users/' + userId + '/status',
      data: JSON.stringify({ status: newStatus }),
      processData: false,
      contentType: 'application/json; charset=utf-8',
      dataType: 'json',
      success: function (data) {
        if (!data.success) {
          showToast(data.message || 'Failed to update status.', 'error');
          return;
        }

        const $badge = $('#status-badge-' + userId);
        const $button = $('#status-btn-' + userId);

        $badge.text(newStatus).attr('class', 'status-badge ' + newStatus);

        if (newStatus === 'inactive') {
          $button
            .text('Activate')
            .attr('class', 'user-action-btn activate-btn')
            .off('click')
            .on('click', function () {
              window.updateStatus(userId, 'active');
            });
        } else {
          $button
            .text('Deactivate')
            .attr('class', 'user-action-btn deactivate-btn')
            .off('click')
            .on('click', function () {
              window.updateStatus(userId, 'inactive');
            });
        }

        showToast('Account ' + newStatus + '.', 'success');
      },
      error: function (error) {
        showToast(error.responseJSON?.message || 'Request failed.', 'error');
      },
    });
  };
});
