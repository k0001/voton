var sys = require('sys');

/**
 * Mongo */

var Db = require('mongodb/db').Db,
    ObjectID = require('mongodb/bson/bson').ObjectID,
    Server = require('mongodb/connection').Server;

    mongo_server = new Server('localhost', 27017, {auto_reconnect: true}, {}),
    mongo_db = new Db('voton', mongo_server);

mongo_db.open(function() {
    sys.puts("Connected to MongoDB!");
});



/**
 * App */

var express = require('express'),
    app = express.createServer();

app.configure(function() {
    app.use(express.logger());
    app.set('view engine', 'jade');
});

app.configure('development', function() {
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
    app.use(express.errorHandler());
});


/**
 * Routing */

app.get('/', function(req, res) {
    mongo_db.collection('votos', function(err, collection) {
        var filters = {}, locals = {};
        // WTF: WTF with all this nesting, DOOOD?! Need to read some more.
        collection.distinct("acta.year", function(err, items) {
            filters.acta__year = items;
            collection.distinct("acta.periodo", function(err, items) {
                filters.acta__periodo = items;
                collection.distinct("full_name", function(err, items) {
                    filters.full_name = items;
                    collection.distinct("bloque", function(err, items) {
                        filters.bloque = items;

                        locals.filters = filters
                        locals.page_title = "Vótonwerk";
                        res.render('index.jade', {'locals': locals});
                    });
                });
            });
        });
    });
});

app.get('/search', function(req, res) {
    mongo_db.collection('votos', function(err, collection) {
        try {
            q = JSON.parse(req.query['q'] || '{}');
        } catch (e) {
            res.send("your JSON writing sucks, dude.", 400);
            return;
        }

        if (!('acta.year' in q) && !('acta.periodo' in q)) {
            res.send("missing acta.year or acta.periodo on query!", 409);
            return;
        }

        collection.find(q, function(err, cursor) {
            cursor.toArray(function(err, items) {
                res.send(JSON.stringify(items));
            });
        });

    });
});



app.listen(3000);
