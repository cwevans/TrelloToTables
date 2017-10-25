var TrelloMagic = {
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
    $.getJSON('https://api.trello.com/1/cards/' + id + '/actions?filter=updateCard:idList', function(data) {
      if (!data.length) return;
      var id = data[0].data.card.id;
      $('#' + id + ' .datemoved').html(TrelloMagic.formatDate(data[0].date));

      if (data[1]) {
        $('#' + id + ' .dateprev').html(TrelloMagic.formatDate(data[1].date));
      }
    });
  },
  getLabels: function(labels) {
    if (!labels) return '';
    var names = [];
    $.map(labels, function(val, i) {
      names.push(val.name || '');
    });
    return names.join(', ');
  },
  formatDate: function(date) {
    var d = new Date(date);
    return d ? (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear() : '';
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
  getCards: function(listId) {
    this.clearCards();
    if (!listId) {
      alert('Choose done list.');
      return;
    }
    $.getJSON('https://api.trello.com/1/lists/' + listId + '/cards', function(data) {
      if (!data.length) {
        return;
      }

      $.each(data, function(idx, val) {
        var tr = '<tr id="' + val.id + '">' +
          '<td><a href="' + val.shortUrl + '" target="_blank">' + val.shortUrl + '</a></td>' +
          '<td>' + val.id + '</td>' +
          '<td>' + val.idShort + '</td>' +
          '<td>' + val.name + '</td>' +
          '<td>' + TrelloMagic.getCategory(val.name) + '</td>' +
          '<td>' + TrelloMagic.getTitle(val.name) + '</td>' +
          '<td>' + TrelloMagic.getStoryPoints(val.name) + '</td>' +
          '<td>' + TrelloMagic.getPriority(val.name) + '</td>' +
          '<td>' + TrelloMagic.getTags(val.name) + '</td>' +
          '<td>' + TrelloMagic.getLabels(val.labels) + '</td>' +
          '<td>' + TrelloMagic.getDateCreated(val.id) + '</td>' +
          '<td class="dateprev"></td>' +
          '<td class="datemoved">' + TrelloMagic.getDateMoved(val.id) + '</td>' +
          '<td>' + TrelloMagic.formatDate(val.dateLastActivity) + '</td>' +
          '</tr>';
        TrelloMagic.$listCards.append(tr);
      });
      TrelloMagic.$listCards.show();
      TrelloMagic.$exportContainer.show();
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
