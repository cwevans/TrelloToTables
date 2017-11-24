var TrelloMagic = {
  allCardsText: 'All cards',
  ajaxDelay: 0, // To slow down the calls to Trello API activity dates for each card
  ajaxDelayDefault: 100,
  $boardId: $('#boardId'),
  $lists: $('#boardLists'),
  $listsContainer: $('#boardListsContainer'),
  $listCards: $('#listCards'),
  $exportBtn: $('#export-csv'),
  $exportContainer: $('#export-csv-container'),
  init: function() {
    this.clearBurndown();
    this.getLists();
    this.$boardId.on('change', function() {
      TrelloMagic.clearBurndown();
      TrelloMagic.getLists();
    });
    this.$lists.on('change', function() {
      TrelloMagic.getCards(TrelloMagic.$lists.val());
    });
    this.$exportBtn.click(function() {
      var args = [TrelloMagic.$listCards, TrelloMagic.$lists.val() + '.csv'];
      TrelloMagic.exportTableToCSV.apply(this, args);
    });
  },
  getLists: function() {
    $.getJSON('https://api.trello.com/1/boards/' + this.$boardId.val() + '/lists?fields=name', function(data) {
      TrelloMagic.$lists.append($('<option>', {
        value: TrelloMagic.$boardId.val(),
        text: TrelloMagic.allCardsText
      }));
      if (data.length) {
        $.each(data, function(i, item) {
          TrelloMagic.$lists.append($('<option>', {
            value: item.id,
            text: item.name
          }));
        });
        TrelloMagic.$listsContainer.show();
      }
    });
  },
  getCategory: function(title) {
    if (!title) return '';
    var itemSplit = title.split('|');
    if (itemSplit.length === 1) return '';
    var cat = itemSplit[0] || '';
    return cat.trim();
  },
  getTitle: function(title) {
    if (!title) return '';
    var itemSplit = title.split('|'),
      name;
    if (itemSplit.length === 1) {
      name = itemSplit[0];
    } else {
      name = (isNaN(itemSplit[1]) ? itemSplit[1] : itemSplit[0]) || '';
    }
    return name.replace(/!/g, '').trim();
  },
  getPriority: function(title) {
    if (!title) return '';
    var priority = title.split('!').length - 1;
    return priority ? priority : '';
  },
  getTags: function(title) {
    if (!title) return '';
    var rgx = /[^[\]]+(?=])/g;
    var matches = title.match(rgx);
    return matches && matches.length ? matches.join(', ') : '';
  },
  getDateCreated: function(id) {
    if (!id) return '';
    var d = new Date(1000 * parseInt(id.substring(0, 8), 16));
    return this.formatDate(d);
  },
  getDateMoved: function(id) {
    if (!id) return '';
    setTimeout(function () {
        TrelloMagic.$exportBtn.addClass('disabled');
        $.getJSON('https://api.trello.com/1/cards/' + id + '/actions?filter=updateCard:idList', function(data) {
          if (!data.length) return '';
          var id = data[0].data.card.id;
          var datePrev, dateMoved = data[0].date, $tr = $('#' + id);
          
          $('.datemoved', $tr).html(TrelloMagic.formatDate(dateMoved));
          
          if (data[1]) {
            datePrev = data[1].date;
            $('.dateprev', $tr).html(TrelloMagic.formatDate(datePrev));
          }
          
          if (datePrev && dateMoved) 
          	$('.datecycle', $tr).html(TrelloMagic.daysBetween(datePrev, dateMoved));
        })
        .always(function(){
          TrelloMagic.$exportBtn.removeClass('disabled');
        });
    }, TrelloMagic.ajaxDelay);
    
    TrelloMagic.ajaxDelay += TrelloMagic.ajaxDelayDefault;
  },
  getLabels: function(labels) {
    if (!labels) return '';
    var names = [];
    $.map(labels, function(val, i) {
      names.push(val.name || '');
    });
    return names.join(', ');
  },
  getListName: function(id) {
    if (!id) return '';
    var name = '';
    $('option', TrelloMagic.$lists).each(function(idx, val) {
      if (id === val.value) {
        name = val.innerText;
        return false;
      }
    });
    return name;
  },
  formatDate: function(date) {
    var d = new Date(date);
    return d ? d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() : '';
  },
  daysBetween: function(d1,d2) {
    if (!d1 || !d2) return '';
    var one_day = 1000*60*60*24;
    var ms1 = new Date(d1).getTime();
    var ms2 = new Date(d2).getTime();
		var diff = ms2-ms1;
    return Math.round(diff/one_day);
  },
  // Returns story points in title or 0 if not found.
  getStoryPoints: function(title) {
    if (!title) return '';
    var storyPoints = '';
    var itemSplit = title.split('|');

    for (i = 0; i < itemSplit.length; i++) {
      var n = parseInt(itemSplit[i]);
      if (isNaN(n)) continue;
      storyPoints = n;
      break;
    }
    return storyPoints;
  },
  getCards: function(id) {
    this.clearCards();
    if (!id) return;
    var path = 'lists';
    
    this.$exportBtn.addClass('disabled');

    $('option', this.$boardId).each(function() {
      var val = $(this).val();
      if (val === id) path = 'boards';
    });

    $.getJSON('https://api.trello.com/1/' + path + '/' + id + '/cards', function(data) {
      if (!data.length) {
        return;
      }
      TrelloMagic.$listCards.show();

      $.each(data, function(idx, val) {
        var dateCreated = TrelloMagic.getDateCreated(val.id);
        var dateLast = TrelloMagic.formatDate(val.dateLastActivity);
        var tr = '<tr id="' + val.id + '">' +
          '<td><a href="' + val.shortUrl + '" target="_blank">' + val.shortUrl + '</a></td>' +
          '<td>' + val.id + '</td>' +
          '<td>' + TrelloMagic.getListName(val.idList) + '</td>' +
          '<td>' + val.idShort + '</td>' +
          '<td>' + val.name + '</td>' +
          '<td>' + TrelloMagic.getCategory(val.name) + '</td>' +
          '<td>' + TrelloMagic.getTitle(val.name) + '</td>' +
          '<td>' + TrelloMagic.getStoryPoints(val.name) + '</td>' +
          '<td>' + TrelloMagic.getPriority(val.name) + '</td>' +
          '<td>' + TrelloMagic.getTags(val.name) + '</td>' +
          '<td>' + TrelloMagic.getLabels(val.labels) + '</td>' +
          '<td class="datecreated">' + dateCreated + '</td>' +
          '<td class="dateprev"></td>' +
          '<td class="datemoved"></td>' +
          '<td class="datelast">' + dateLast + '</td>' +
          '<td class="datecycle">'+ TrelloMagic.daysBetween(dateCreated, dateLast) +'</td>' +
          '</tr>';
        TrelloMagic.$listCards.append(tr);
        TrelloMagic.getDateMoved(val.id);
      });
      TrelloMagic.$exportContainer.show();
    })
    .always(function(){
      TrelloMagic.$exportBtn.removeClass('disabled');
    });
  },
  clearBurndown: function() {
    this.clearCards();
    this.clearLists();
  },
  clearCards: function() {
    $('tbody tr', this.$listCards).remove();
    this.$listCards.hide();
    this.$exportContainer.hide();
  },
  clearLists: function() {
    this.$listsContainer.hide();
    this.$lists.html('').append('<option value="">Choose list</option>');
  },
  exportTableToCSV: function($table, filename) {
    var $rows = $table.find('tr:has(td)'),
      // Temporary delimiter characters unlikely to be typed by keyboard
      // This is to avoid accidentally splitting the actual contents
      tmpColDelim = String.fromCharCode(11), // vertical tab character
      tmpRowDelim = String.fromCharCode(0), // null character
      // actual delimiter characters for CSV format
      colDelim = '","',
      rowDelim = '"\r\n"',
      // Grab text from table into CSV formatted string
      csv = '"' + $rows.map(function(i, row) {
        var $row = $(row),
          $cols = $row.find('td');

        return $cols.map(function(j, col) {
          var $col = $(col),
            text = $col.text();
          // escape double quotes
          return text.replace(/"/g, '""');
        }).get().join(tmpColDelim);
      }).get().join(tmpRowDelim)
      .split(tmpRowDelim).join(rowDelim)
      .split(tmpColDelim).join(colDelim) + '"';

    // Deliberate 'false', see comment below
    if (false && window.navigator.msSaveBlob) {

      var blob = new Blob([decodeURIComponent(csv)], {
        type: 'text/csv;charset=utf8'
      });

      // Crashes in IE 10, IE 11 and Microsoft Edge
      // See MS Edge Issue #10396033: https://goo.gl/AEiSjJ
      // Hence, the deliberate 'false'
      // This is here just for completeness
      // Remove the 'false' at your own risk
      window.navigator.msSaveBlob(blob, filename);
    } else if (window.Blob && window.URL) {
      // HTML5 Blob        
      var blob = new Blob([csv], {
        type: 'text/csv;charset=utf8'
      });
      var csvUrl = URL.createObjectURL(blob);
      $(this).attr({
        'download': filename,
        'href': csvUrl
      });
    } else {
      // Data URI
      var csvData = 'data:application/csv;charset=utf-8,' + encodeURIComponent(csv);
      $(this).attr({
        'download': filename,
        'href': csvData,
        'target': '_blank'
      });
    }
  }
}

TrelloMagic.init();
