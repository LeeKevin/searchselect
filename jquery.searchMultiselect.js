/**
 * @summary     SearchMultiselect
 * @description Form element for displaying a list of select options and allows multiselect and searching
 * @version     1.0.1
 * @file        jquery.searchMultiselect.js
 * @author      Kevin Lee
 */

(function () {

    var SearchMultiSelect;

    $.fn.searchMultiselect = function (options) {
        //var args = arguments;
        var result;

        this.each(function () {
            var $this, searchmultiselect;
            $this = $(this);
            searchmultiselect = $this.data('searchmultiselect');
            if (searchmultiselect instanceof SearchMultiSelect) {
                //do methods
                if (typeof options == 'string') {
                    if (options == 'selected') {
                        result = searchmultiselect.getSelected();
                        return false; //stop
                    }
                    //else if (args.length >= 2 && options == 'select') return searchmultiselect.select(args[1]);
                }
            } else {
                if (typeof options == 'string') throw "You must initialize the searchSingleSelect element before calling a method.";
                $this.data('searchmultiselect', new SearchMultiSelect(this, options));
            }
        });

        if (typeof result == 'undefined') result = this;

        return result;
    };

    $.fn.searchMultiselect.defaults = {
        placeholder: '',
        width: '400px',
        optionListHeight: '250px',
        caseSensitive: false,
        specialCharactersSensitive: false,
        onChange: function (event) {
        } //callback to be executed when change in selected
    };

    SearchMultiSelect = (function () {
        SearchMultiSelect.classprefix = 'searchmulti-';

        function SearchMultiSelect(element, preferences) {

            this.settings = $.fn.searchMultiselect.defaults;
            if (preferences && typeof(preferences) == 'object') {
                this.settings = $.extend({}, this.settings, preferences);
            }

            this.multiselect = $(element);
            if (!this.multiselect.length) return;

            this.selected = {};
            this.options = {};
            this.mouseOnContainer = false;

            this.setup_html();
            this.register_listeners();
        }

        SearchMultiSelect.prototype.setup_html = function () {
            var _this = this;
            var name = _this.multiselect.attr('name');
            if (typeof name != 'undefined' && name.substr(-2) != '[]') name += '[]';

            _this.multiselect.addClass('searchMultiselect').css('width', _this.settings.width);
            _this.select = $('<div class="select-container" />');
            $('<div class="autocomplete" />').appendTo(_this.select).hide();
            $('<input type="text" class="select" />').attr('placeholder', _this.settings.placeholder).appendTo(_this.select);
            _this.selected_items_list = $('<span>Selected: </span>');
            _this.selected_items = $('<div class="selected_items" />').append(_this.selected_items_list);
            _this.options_list = $('<div class="options" />').css('max-height', _this.settings.optionListHeight);

            //get options and convert to checkboxes
            _this.multiselect.children('option').each(function (i, item) {
                var val = item.getAttribute('value');
                var text = item.textContent.trim();
                var id = val.replace(/[^\w\s]/gi, '');

                _this.options[val] = text; //store option val/label in list for reference

                var checkbox = $('<input type="checkbox" />').attr('id', 'option-' + id).val(val);
                var label = $('<label />').attr('for', 'option-' + id).text(text);
                if (typeof name != 'undefined') checkbox.attr('name', name);
                if (item.selected) {
                    checkbox.attr('checked', true);
                    _this.updateSelectedItems(checkbox); //add to list of selected items
                }

                _this.options_list.append(checkbox).append(label); //build the item in DOM
            });

            _this.multiselect.empty(); //clear out anything inside
            _this.multiselect.append(_this.select).append(_this.selected_items).append(_this.options_list); //put together all the parts
            _this.selected_items.css('max-height', _this.selected_items.find('span').height() + 10);
        };

        SearchMultiSelect.prototype.register_listeners = function () {
            var _this = this;

            this.multiselect.bind('mouseover.' + SearchMultiSelect.classprefix, function () {
                _this.mouseover_container();
            }).bind('mouseout.' + SearchMultiSelect.classprefix, function () {
                _this.mouseout_container();
            });

            _this.multiselect.find('.options').find('input').bind('change', function () { //add click listeners
                _this.optionClick(event, this);
            });

            _this.multiselect.find('.selected_items').find('i').live('click', function (event) {
                _this.removeSelectedOption(event, this);
            });

            _this.multiselect.find('.select').bind('keyup', function (event) {
                _this.searchKeyUp(event, this);
            }).bind('keydown', function (event) {
                _this.searchKeyDown(event);
            }).bind('focus', function () {
                _this.searchFocus();
            });

            this.multiselect.bind('click', function () {
                _this.click_container(this);
            });
        };

        SearchMultiSelect.prototype.optionClick = function (event, option) {
            this.updateSelectedItems(option);
            this.settings.onChange.call(option, event);
        };

        SearchMultiSelect.prototype.removeSelectedOption = function (event, link) {
            var option = $(link).closest('a').attr('data-option');
            this.updateSelectedItems(this.multiselect.find('.options').find('#' + option).attr('checked', false));
            //since the element isn't part of the DOM anymore, the show/hide listener for the multiselect will hide.
            //if you remove the following, the options list will hide after removal.
            this.settings.onChange.call(link, event);
            event.stopImmediatePropagation();
        };

        SearchMultiSelect.prototype.searchKeyUp = function (event, input) {
            this.autocomplete = '';
            this.autocomplete_option = '';
            this.multiselect.find('.autocomplete').hide();

            var original_str = $(input).val();
            var str = original_str.trim();
            var option;

            if (!this.settings.caseSensitive) str = str.toLowerCase();
            if (!this.settings.specialCharactersSensitive) str = str.replace(/[^\w\s]/gi, '');

            if (!str.length) {
                this.multiselect.find('.options').find('label').show();
                for (option in this.options) {
                    if (this.options.hasOwnProperty(option)) {
                        this.multiselect.find('.options').find('label[for=option-' + option + ']').text(this.options[option]);
                    }
                }
                return;
            }
            this.multiselect.find('.options').find('label').hide();
            for (option in this.options) {
                if (this.options.hasOwnProperty(option)) {
                    var option_str = this.options[option];
                    if (!this.settings.caseSensitive) option_str = option_str.toLowerCase();
                    if (!this.settings.specialCharactersSensitive) option_str = option_str.replace(/[^\w\s]/gi, '');

                    if (option_str.indexOf(str) > -1) {
                        var highlighted_option_string = this.options[option].replace(new RegExp('(' + str + ')', 'gi'), function (term) {
                            return '<strong>' + term + '</strong>';
                        });
                        this.multiselect.find('.options').find('label[for=option-' + option + ']').show().html(highlighted_option_string);
                    } else {
                        this.multiselect.find('.options').find('label[for=option-' + option + ']').text(this.options[option]);
                    }
                    var index;
                    if (!this.autocomplete.length && (index = this.options[option].toLowerCase().indexOf(original_str.toLowerCase())) == 0) {
                        this.autocomplete = this.options[option].substring(index + original_str.length);
                        this.autocomplete_option = option;
                    }
                }
            }

            if (this.autocomplete.length) this.multiselect.find('.autocomplete').html('<span>' + original_str + '</span>').append(this.autocomplete).show();
        };

        SearchMultiSelect.prototype.searchKeyDown = function (event) {
            var code = event.keyCode || event.which;
            if ((code == 9 || code == 13) && typeof this.autocomplete !== 'undefined' && this.autocomplete.length) {
                $(this).val(this.options[this.autocomplete_option]);
                this.multiselect.find('.autocomplete').hide();
                this.autocomplete = '';
                event.preventDefault();
            }
            if (code == 13 && typeof this.autocomplete_option !== 'undefined' && this.autocomplete_option.length && typeof this.selected[this.autocomplete_option] == 'undefined') {
                this.updateSelectedItems(this.multiselect.find('.options').find('#option-' + this.autocomplete_option).attr('checked', true));
            }
        };

        SearchMultiSelect.prototype.searchFocus = function () {
            this.multiselect.addClass('active');
        };

        SearchMultiSelect.prototype.click_container = function (element) {
            var _this = this;
            _this.owner_document = $(element.ownerDocument);
            _this.owner_document.bind('click.' + SearchMultiSelect.classprefix, function () {
                _this.closeDropDown();
            });
        };

        SearchMultiSelect.prototype.closeDropDown = function () {
            if (this.mouseOnContainer) {
                this.multiselect.addClass('active');
            } else {
                this.multiselect.removeClass('active');
                this.owner_document.unbind('click.' + SearchMultiSelect.classprefix);
            }
        };

        SearchMultiSelect.prototype.mouseover_container = function () {
            this.mouseOnContainer = true;
        };

        SearchMultiSelect.prototype.mouseout_container = function () {
            this.mouseOnContainer = false;
        };

        SearchMultiSelect.prototype.updateSelectedItems = function (item) {
            var _this = this;
            var val = $(item).val();
            var calc_height;
            if ($(item).is(':checked')) { //add item
                //note: adding is already animated via CSS3
                _this.selected[val] = this.options[val];
                $('<a />').appendTo(_this.selected_items_list).attr('data-option', $(item).attr('id')).html(this.options[val] + '<i/>');
                calc_height = _this.selected_items.find('span').height();
                _this.selected_items.css('max-height', calc_height + 10);
            } else { //remove item
                delete _this.selected[val]; //remove from list

                //remove and animate the removal from the list
                if (Object.keys(_this.selected).length) { //this check is required for the animation because the last element stalls a bit too much without
                    //set the height to the current calculated height (to hold the height)
                    var old_height = _this.selected_items.find('span').height() + 10;
                    _this.selected_items.css('height', old_height);

                    //remove from DOM:
                    _this.selected_items_list.children('a[data-option=' + $(item).attr('id') + ']').remove();

                    calc_height = _this.selected_items.find('span').height() + 10; //new height without item
                    if (old_height == calc_height) { //if no change in height...
                        _this.selected_items.css('height', 'auto'); //set height back to auto
                    } else {
                        //animate the height down
                        _this.selected_items.animate({height: calc_height}, 500, 'swing', function () {
                            _this.selected_items.css('height', 'auto'); //set height back to auto
                        });
                        _this.selected_items.css('max-height', calc_height); //set new max-height
                    }
                }
            }

            if (Object.keys(_this.selected).length) {
                _this.selected_items.removeClass('empty');
            } else {
                _this.selected_items.addClass('empty');
                _this.selected_items_list.children('a').remove();
            }
        };

        SearchMultiSelect.prototype.getSelected = function () {
            return Object.keys(this.selected);
        };

        return SearchMultiSelect;
    })();

})();