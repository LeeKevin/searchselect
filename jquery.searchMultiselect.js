/**
 * @summary     SearchMultiselect
 * @description Form element for displaying a list of select options and allows multiselect and searching
 * @version     1.0.0
 * @file        jquery.searchMultiselect.js
 * @author      Kevin Lee
 */

(function () {

    $.fn.searchMultiselect = function (preferences) {
        var settings = $.extend({
            placeholder: '',
            width: '400px',
            optionListHeight: '250px',
            caseSensitive: false,
            specialCharactersSensitive: false,
            onChange: function (event) {} //callback to be executed when change in selected
        }, preferences);

        var multiselect = $(this);
        if (!multiselect.length) return;

        multiselect.addClass('searchMultiselect');
        multiselect.css('width', settings.width);

        var name = multiselect.attr('name');
        if (typeof name != 'undefined' && name.substr(-2) != '[]') name += '[]';

        var selected = {};
        var options = {};

        /** Assemble the DOM Structure **/
        var $select = $('<div class="select-container" />');
        $('<div class="autocomplete" />').appendTo($select).hide();
        $('<input type="text" class="select" />').attr('placeholder', settings.placeholder).appendTo($select);
        var $selected_items_list = $('<span>Selected: </span>');
        var $selected_items = $('<div class="selected_items" />').append($selected_items_list);
        var $options = $('<div class="options" />').css('max-height', settings.optionListHeight);

        //get options and convert to checkboxes
        multiselect.children('option').each(function (i, item) {
            var val = item.getAttribute('value');
            var text = item.textContent.trim();
            var id = val.replace(/[^\w\s]/gi, '');

            options[val] = text; //store option val/label in list for reference

            var checkbox = $('<input type="checkbox" />').attr('id', 'option-' + id).val(val);
            var label = $('<label />').attr('for', 'option-' + id).text(text);
            if (typeof name != 'undefined') checkbox.attr('name', name);
            if (item.selected) {
                checkbox.attr('checked', true);
                updateSelectedItems(checkbox); //add to list of selected items
            }

            $options.append(checkbox).append(label); //build the item in DOM
        });

        multiselect.empty(); //clear out anything inside
        multiselect.append($select).append($selected_items).append($options); //put together all the parts
        $selected_items.css('max-height', $selected_items.find('span').height() + 10);

        multiselect.find('.options').find('input').live('change', function () { //add click listeners
            updateSelectedItems(this);
            settings.onChange.call(event);
        });

        multiselect.find('.selected_items').find('i').live('click', function (e) {
            var option = $(this).closest('a').attr('data-option');
            updateSelectedItems(multiselect.find('.options').find('#' + option).attr('checked', false));
            //since the element isn't part of the DOM anymore, the show/hide listener for the multiselect will hide.
            //if you remove the following, the options list will hide after removal.
            settings.onChange.call(event);
            e.stopImmediatePropagation();
        });

        var autocomplete;
        var autocomplete_option;
        multiselect.find('.select').live('keyup', function (e) {
            autocomplete = '';
            autocomplete_option = '';
            multiselect.find('.autocomplete').hide();

            var original_str = $(this).val();
            var str = original_str.trim();
            if (!settings.caseSensitive) str = str.toLowerCase();
            if (!settings.specialCharactersSensitive) str = str.replace(/[^\w\s]/gi, '');

            if (!str.length) {
                multiselect.find('.options').find('label').show();
                return;
            }
            multiselect.find('.options').find('label').hide();
            for (var option in options) {
                if (options.hasOwnProperty(option)) {
                    var option_str = options[option];
                    if (!settings.caseSensitive) option_str = option_str.toLowerCase();
                    if (!settings.specialCharactersSensitive) option_str = option_str.replace(/[^\w\s]/gi, '');

                    if (option_str.indexOf(str) > -1) {
                        multiselect.find('.options').find('label[for=option-' + option + ']').show();
                    }
                    var index;
                    if (!autocomplete.length && (index = options[option].toLowerCase().indexOf(original_str.toLowerCase())) == 0) {
                        autocomplete = options[option].substring(index + original_str.length);
                        autocomplete_option = option;
                    }
                }
            }

            if (autocomplete.length) multiselect.find('.autocomplete').html('<span>' + original_str + '</span>').append(autocomplete).show();
        });

        multiselect.find('.select').live('keydown', function (e) {
            var code = e.keyCode || e.which;
            if ((code == 9 || code == 13) && autocomplete.length) {
                $(this).val(options[autocomplete_option]);
                multiselect.find('.autocomplete').hide();
                autocomplete = '';
                e.preventDefault();
            }
            if (code == 13 && autocomplete_option.length && typeof selected[autocomplete_option] == 'undefined') {
                updateSelectedItems(multiselect.find('.options').find('#option-' + autocomplete_option).attr('checked', true));
            }
        }).live('focus', function () {
            multiselect.addClass('active');
        });

        $('html').live('click', function (e) {
            if ($(e.target) == multiselect || $(e.target).closest(multiselect.selector).length) {
                multiselect.addClass('active');
            } else {
                multiselect.removeClass('active');
            }
        });

        function updateSelectedItems(item) {
            var val = $(item).val();
            if ($(item).is(':checked')) { //add item
                //note: adding is already animated via CSS3
                selected[val] = options[val];
                $('<a />').appendTo($selected_items_list).attr('data-option', $(item).attr('id')).html(options[val] + '<i/>');
                var calc_height = $selected_items.find('span').height();
                $selected_items.css('max-height', calc_height + 10);
            } else { //remove item
                delete selected[val]; //remove from list

                //remove and animate the removal from the list
                if (Object.keys(selected).length) { //this check is required for the animation because the last element stalls a bit too much without
                    //set the height to the current calculated height (to hold the height)
                    var old_height = $selected_items.find('span').height() + 10;
                    $selected_items.css('height', old_height);

                    //remove from DOM:
                    $selected_items_list.children('a[data-option=' + $(item).attr('id') + ']').remove();

                    var calc_height = $selected_items.find('span').height() + 10; //new height without item
                    if (old_height == calc_height) { //if no change in height...
                        $selected_items.css('height', 'auto'); //set height back to auto
                    } else {
                        //animate the height down
                        $selected_items.animate({height: calc_height}, 500, 'swing', function () {
                            $selected_items.css('height', 'auto'); //set height back to auto
                        });
                        $selected_items.css('max-height', calc_height); //set new max-height
                    }
                }
            }

            if (Object.keys(selected).length) {
                $selected_items.removeClass('empty');
            } else {
                $selected_items.addClass('empty');
                $selected_items_list.children('a').remove();
            }
        }

        //public function to return list of options values
        $.fn.searchMultiselect.selectedItems = function () {
            return Object.keys(selected);
        };

        //public function to return text for a given option value
        $.fn.searchMultiselect.optionText = function (option) {
            if (typeof options[option] != 'undefined') {
                return options[option];
            }
            return undefined;
        };
    };
})();