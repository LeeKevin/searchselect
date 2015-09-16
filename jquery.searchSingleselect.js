/**
 * @summary     SearchSingleselect
 * @description Form element for displaying a list of select options and allows searching
 * @version     1.0.0
 * @file        jquery.searchSearchselect.js
 * @author      Kevin Lee
 */

(function () {

    var SearchSingleSelect;

    $.fn.searchSingleselect = function (options) {
        var args = arguments;
        return this.each(function () {
            var $this, searchsingleselect;
            $this = $(this);
            searchsingleselect = $this.data('searchsingleselect');
            if (searchsingleselect instanceof SearchSingleSelect) {
                //do methods
                if (typeof options == 'string') {
                    if (options == 'destroy') return searchsingleselect.destroy();
                    else if (options == 'clear') return searchsingleselect.clear();
                    else if (options == 'refresh') return searchsingleselect.refresh($this);
                    else if (args.length >= 2 && options == 'select') return searchsingleselect.select(args[1]);
                }
            } else {
                if (typeof options == 'string') throw "You must initialize the searchSingleSelect element before calling a method.";
                $this.data('searchsingleselect', new SearchSingleSelect(this, options));
            }
        });
    };

    $.fn.searchSingleselect.defaults = {
        placeholder: 'Search...',
        width: '300px',
        optionListHeight: '250px',
        caseSensitive: false,
        specialCharactersSensitive: false,
        showOutline: true,
        noResultsString: '', // or function (searchTerm) {}
        onSelect: function (event) {
        } //callback to be executed when change in selected
    };

    SearchSingleSelect = (function () {
        SearchSingleSelect.classprefix = 'searchsingle-';

        function SearchSingleSelect(element, preferences) {

            this.settings = $.fn.searchSingleselect.defaults;
            if (preferences && typeof(preferences) == 'object') {
                this.settings = $.extend({}, this.settings, preferences);
            }

            this.oldselect = $(element);
            if (!this.oldselect.length) return;

            this.mouseOnContainer = false;

            this.setup_html();
            this.register_listeners();
            this.updateSingleSelectDOM();
        }

        SearchSingleSelect.prototype.register_listeners = function () {
            var _this = this;
            //Listeners

            //mousedown because we need it to fire before blur
            this.main_display.bind('mousedown.' + SearchSingleSelect.classprefix, function (event) {
                _this.main_mousedown(event, this);
            });

            this.search.bind('focus.' + SearchSingleSelect.classprefix, function () {
                _this.focus_search();
            }).bind('blur.' + SearchSingleSelect.classprefix, function () {
                _this.blur_search();
            });

            this.singleselect.bind('mouseover.' + SearchSingleSelect.classprefix, function () {
                _this.mouseover_container();
            }).bind('mouseout.' + SearchSingleSelect.classprefix, function () {
                _this.mouseout_container();
            });

            this.singleselect.bind('click', function () {
                _this.click_container(this);
            });

            this.option_list.bind('mousewheel.' + SearchSingleSelect.classprefix + ' DOMMouseScroll.' + SearchSingleSelect.classprefix, function (event) {
                _this.scroll(event, this);
            });

            this.singleselect.bind('keydown.' + SearchSingleSelect.classprefix, function (event) {
                _this.keydown(event);
            }).bind('keyup.' + SearchSingleSelect.classprefix, function (event) {
                _this.keyup(event);
            });

            this.clear_button.bind('mousedown.' + SearchSingleSelect.classprefix, function (event) {
                event.preventDefault();
                event.stopImmediatePropagation();

                _this.clearSelection(event);
            });
        };

        SearchSingleSelect.prototype.setup_html = function () {
            this.singleselect = $('<div class="searchSingleselect" />');
            this.search = $('<input type="text" autocomplete="off" />');
            this.option_list = $('<ul class="' + SearchSingleSelect.classprefix + 'list" />').css('max-height', this.settings.optionListHeight);
            this.dropdown = $('<div class="' + SearchSingleSelect.classprefix + 'drop" />').append($('<div class="' + SearchSingleSelect.classprefix + 'search"/>').append(this.search)).append(this.option_list);
            this.clear_button = $('<a class="' + SearchSingleSelect.classprefix + 'close-button" />');
            this.main_display = $('<a class="' + SearchSingleSelect.classprefix + 'main ' + SearchSingleSelect.classprefix + 'placeholder" />').html("<span>" + this.settings.placeholder + "</span>").append(this.clear_button);
            this.singleselect
                .append(this.main_display)
                .append(this.dropdown)
                .insertAfter(this.oldselect);
        };

        SearchSingleSelect.prototype.main_mousedown = function (event, element) {
            event.preventDefault();
            $(element).toggleClass(SearchSingleSelect.classprefix + 'opened');
            if ($(element).hasClass(SearchSingleSelect.classprefix + 'opened')) this.resetSearch();
        };

        SearchSingleSelect.prototype.focus_search = function () {
            this.main_display.addClass('active');
        };

        SearchSingleSelect.prototype.blur_search = function () {
            this.closeDropDown(this);
            this.main_display.removeClass('active');
        };

        SearchSingleSelect.prototype.mouseover_container = function () {
            this.mouseOnContainer = true;
        };

        SearchSingleSelect.prototype.mouseout_container = function () {
            this.mouseOnContainer = false;
        };

        SearchSingleSelect.prototype.click_container = function (element) {
            this.owner_document = $(element.ownerDocument);
            this.owner_document.bind('click.' + SearchSingleSelect.classprefix, this.closeDropDown(this));
            this.search.focus();
        };

        SearchSingleSelect.prototype.scroll = function (event, element) {
            var delta;
            if (event.originalEvent) {
                delta = event.originalEvent.deltaY || -event.originalEvent.wheelDelta || event.originalEvent.detail;
            }
            if (delta != null) {
                event.preventDefault();
                if (event.type === 'DOMMouseScroll') {
                    delta = delta * 40;
                }
                return $(element).scrollTop(delta + $(element).scrollTop());
            }
        };

        SearchSingleSelect.prototype.keydown = function (event) {
            var stroke, highlighted;
            stroke = event.which != null ? event.which : event.keyCode;
            highlighted = this.option_list.find('.highlighted:first');
            switch (stroke) {
                case 9: //tab
                case 13: //enter
                    if (!this.main_display.hasClass(SearchSingleSelect.classprefix + 'opened')) return;
                    event.preventDefault();
                    if (highlighted.length) this.updateSelected(event, highlighted);
                    break;
                case 38: //up arrow
                    if (!this.main_display.hasClass(SearchSingleSelect.classprefix + 'opened')) return this.main_display.mousedown();
                    event.preventDefault();
                    if (highlighted.length) {
                        if (highlighted.is(':first-of-type')) this.main_display.removeClass(SearchSingleSelect.classprefix + 'opened');
                        return this.highlightItem(highlighted.prevAll('li:visible:first'));
                    }
                    break;
                case 40: //down arrow
                    if (!this.main_display.hasClass(SearchSingleSelect.classprefix + 'opened')) return this.main_display.mousedown();
                    event.preventDefault();
                    if (highlighted.length) {
                        return this.highlightItem(highlighted.nextAll('li:visible:first'));
                    }
                    break;
            }
        };

        SearchSingleSelect.prototype.keyup = function (event) {
            var stroke;
            stroke = event.which != null ? event.which : event.keyCode;
            switch (stroke) {
                case 9:
                    if (this.main_display.hasClass(SearchSingleSelect.classprefix + 'opened')) event.preventDefault();
                    break;
                case 13:
                case 16:
                case 17:
                case 18:
                case 27:
                case 38:
                case 40:
                case 91:
                    event.preventDefault();
                    break;
                default:
                    this.filterResults();
            }
        };

        SearchSingleSelect.prototype.clearSelection = function (event) {
            this.selected = null;
            this.main_display.find('span').text(this.settings.placeholder);
            this.main_display.addClass(SearchSingleSelect.classprefix + 'placeholder');

            this.oldselect.val('');
            if ($.isFunction(this.settings.onSelect)) this.settings.onSelect.call(this.oldselect, event);
        };

        SearchSingleSelect.prototype.closeDropDown = function (_this) {
            if (!_this.mouseOnContainer || !_this.main_display.hasClass(SearchSingleSelect.classprefix + 'opened')) {
                _this.main_display.removeClass(SearchSingleSelect.classprefix + 'opened');
                if (_this.owner_document instanceof $) {
                    _this.owner_document.unbind('click.' + SearchSingleSelect.classprefix, _this.closeDropDown);
                }
            }
        };

        SearchSingleSelect.prototype.updateSelected = function (event, element) {
            this.selected = $(element).attr('data-val');
            this.main_display.find('span').text($(element).text());
            this.main_display.removeClass(SearchSingleSelect.classprefix + 'opened').removeClass(SearchSingleSelect.classprefix + 'placeholder');

            //set value for oldselect
            this.oldselect.val(this.selected);
            if ($.isFunction(this.settings.onSelect)) this.settings.onSelect.call(this.oldselect, event);
        };

        SearchSingleSelect.prototype.highlightItem = function ($item) {
            if (!($item instanceof $ && $item.length && !$item.hasClass('noresults'))) return;
            var container, maxHeight, visible_top, visible_bottom, item_top, item_bottom;
            container = $item.closest('ul');
            if (!container.length) return false;

            $item.addClass('highlighted').siblings().removeClass('highlighted');

            maxHeight = parseInt(container.css('maxHeight'), 10);
            visible_top = container.scrollTop();
            visible_bottom = maxHeight + visible_top;
            item_top = $item.position().top + visible_top;
            item_bottom = item_top + $item.outerHeight();
            if (item_bottom >= visible_bottom) { //if focusing item below visible bottom
                return container.scrollTop((item_bottom - maxHeight) > 0 ? item_bottom - maxHeight : 0);
            } else if (item_top < visible_top) {//if focusing item above visible top
                return container.scrollTop(item_top);
            }
        };

        SearchSingleSelect.prototype.filterResults = function () {
            var search, originalSearch;
            search = originalSearch = this.search.val().trim();
            if (!this.settings.caseSensitive) search = search.toLowerCase();
            if (!this.settings.specialCharactersSensitive) search = search.replace(/[^\w\s]/gi, '');

            this.option_list.find('li.noresults').remove();
            this.option_list.find('li').toggle(!search.length);

            for (var option in this.options) {
                if (this.options.hasOwnProperty(option)) {
                    var option_str = this.options[option];
                    if (!this.settings.caseSensitive) option_str = option_str.toLowerCase();
                    if (!this.settings.specialCharactersSensitive) option_str = option_str.replace(/[^\w\s]/gi, '');
                    if (search.length && option_str.indexOf(search) > -1) {
                        var highlighted_option_string = this.options[option].replace(new RegExp('(' + search + ')', 'gi'), function (term) {
                            return '<span style="text-decoration: underline">' + term + '</span>';
                        });
                        this.option_list.find('li#option-' + option).show().html(highlighted_option_string);
                    } else {
                        this.option_list.find('li#option-' + option).text(this.options[option]);
                    }
                }
            }
            if (!this.option_list.find('li:visible').length) {

                var noresults_string = 'No results match ' + originalSearch + '.';

                if (typeof this.settings.noResultsString == 'string' && this.settings.noResultsString) {
                    noresults_string = this.settings.noResultsString;
                } else if (typeof this.settings.noResultsString == 'function') {
                    var result = this.settings.noResultsString(originalSearch);
                    if (typeof result == 'string' && result) noresults_string = result;
                }

                this.option_list.append('<li class="noresults">' + noresults_string + '</li>');
            }
            this.highlightItem(this.option_list.find('li:visible:first'));
        };

        SearchSingleSelect.prototype.resetSearch = function () {
            this.search.val('');
            this.option_list.find('li.noresults').remove();
            this.option_list.find('li').show();
            this.highlightItem(this.selected ? this.option_list.find('li[data-val=' + this.selected + ']') : this.option_list.find('li:visible:first'));
        };

        SearchSingleSelect.prototype.updateSingleSelectDOM = function () {
            var _this = this;
            var attributes = this.oldselect[0].attributes;

            //$.each(attributes, function () {
            for (var att, i = 0; i < attributes.length; i++) {
                att = attributes[i];
                if (att.nodeName == 'id') continue;
                if (att.nodeName == 'class') {
                    this.singleselect.addClass(att.nodeValue);
                    continue;
                }
                if (att.nodeName == 'tabindex') {
                    this.search.attr(att.nodeName, att.nodeValue);
                    continue;
                }
                this.singleselect.attr(att.nodeName, att.nodeValue);
            }

            this.singleselect.css('width', this.settings.width);
            if (!this.settings.showOutline) this.main_display.css('box-shadow', 'none');
            this.oldselect.hide().attr('tabindex', -1).prepend('<option value=""></option>').val('');

            this.options = {};
            this.selected = null;

            this.option_list.empty();
            this.oldselect.children('option').each(function (i, item) {
                var val, text, id, listitem;
                val = item.getAttribute('value');
                if (!val || 0 === val.length) return true;
                text = item.textContent.trim();
                id = val.replace(/[^\w\s]/gi, '');

                _this.options[val] = text; //store option val/label in list for reference

                listitem = $('<li />').attr('id', 'option-' + id).attr('data-val', val).text(text);
                _this.option_list.append(listitem); //build the item in DOM
            });

            this.option_list.find('li').bind('click.' + SearchSingleSelect.classprefix, function (event) {
                _this.updateSelected(event, this);
            }).bind('mouseover.' + SearchSingleSelect.classprefix, function () {
                _this.highlightItem($(this));
            });

            //update z-index of search
            this.search.parent('div').css('z-index', this.search.zIndex() + 50);
        };

        //extra methods

        SearchSingleSelect.prototype.destroy = function () {
            if (this.owner_document instanceof $ && this.owner_document.length) {
                this.owner_document.unbind('click.' + SearchSingleSelect.classprefix, this.closeDropDown);
            }
            this.oldselect.show().attr('tabindex', this.singleselect.attr('tabindex'));
            this.oldselect.find('option[value=""]:first').remove();
            this.singleselect.remove();
            return true;
        };

        SearchSingleSelect.prototype.select = function (option) {
            if (this.options.hasOwnProperty(option)) {
                var $option = this.option_list.find('[data-val=' + option + ']');
                if ($option.length) $option.click();
            }
            return true;
        };

        SearchSingleSelect.prototype.clear = function () {
            this.clear_button.mousedown();
            return true;
        };

        SearchSingleSelect.prototype.refresh = function ($originalSelect) {
            this.oldselect = $originalSelect;
            if (!this.oldselect.length) return true;

            this.oldselect.find('option[value=""]:first').remove();

            var singleselect_display_style = this.singleselect.css('display');
            if (singleselect_display_style) {
                this.oldselect.css('display', singleselect_display_style);
            }

            if (this.search[0].hasAttribute('tabindex')) {
                this.oldselect.attr('tabindex', this.search.attr('tabindex'));
            }

            this.updateSingleSelectDOM();

            return true;
        };

        return SearchSingleSelect;
    })();

})();