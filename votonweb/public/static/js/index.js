$(document).ready(function() {
    $('#search button').click(function(e) {
        var form = $(this).parent(),
            query = $.param(form.serializeArray().filter(function(x) { return x['value'] != '---' })),
            search_url = '/search.json?' + query;
        $.getJSON(search_url, function(res) {
            if (res.status == 'ERROR')
                alert('ERROR at ' + search_url +'\n' + (res.info || ""));
            else {
                console.log(res.payload.votes.length + ' votes.');
            }
        });
        return false;
    });
});
