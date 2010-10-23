var sys = require('sys'),
    util = require('./util');

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
    app.use(express.gzip());
    app.set('view engine', 'jade');
});

app.helpers({
    'STATIC_URL': '/static'
});

app.configure('development', function() {
    app.use(express.staticProvider(__dirname + '/public'));
    app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function() {
    app.use(express.cache());
    app.use(express.errorHandler());
});


/**
 * Routing */

app.get('/', function(req, res) {
    mongo_db.collection('votos', function(err, collection) {
        var filters = {}, locals = {};
        // WTF: WTF with all this nesting, DOOOD?! Need to read some more.
        collection.distinct("acta.periodo", function(err, items) {
            filters.acta__periodo = items;
            collection.distinct("full_name", function(err, items) {
                filters.full_name = items;
                collection.distinct("bloque", function(err, items) {
                    filters.bloque = items;
                    filters.acta__year = [2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010];
                    filters.acta__tipo = ['PT', 'ET', 'OT', 'OE', 'EE', 'OP'];
                    locals.filters = filters
                    locals.page_title = "Vótonwerk";
                    res.render('index.jade', {'locals': locals});
                });
            });
        });
    });
});

app.get('/search.json', function(req, res) {
    mongo_db.collection('votos', function(err, collection) {
        var mq = {};

        if (req.query['acta__year']) {
            x = Number(req.query['acta__year']);
            if (isNaN(x)) {
                res.send({
                    "status": "ERROR",
                    "info": "acta__year is not a numner"
                }, 400);
                return;
            }
            mq['acta.year'] = x;
        }

        if (req.query['acta__periodo']) {
            x = Number(req.query['acta__periodo']);
            if (isNaN(x)) {
                res.send({
                    "status": "ERROR",
                    "info": "acta__periodo is not a numner"
                }, 400);
                return;
            }
            mq['acta.periodo'] = x;
        }

        if (req.query['acta__tipo'])
            mq['acta.tipo'] = req.query['acta__tipo'];
        if (req.query['full_name'])
            mq['full_name'] = req.query['full_name'];
        if (req.query['bloque'])
            mq['bloque'] = req.query['bloque'];

        if (util.is_empty(mq)) {
            res.send({
                "status": "ERROR",
                "info": "Specifying at least one search filter is required."
            }, 409);
            return;
        }
        collection.find(mq, function(err, cursor) {
            cursor.toArray(function(err, items) {
                res.send({
                    "status": "OK",
                    "info": items.length + " items found.",
                    "payload": {
                        "votes": items,
                    }
                });
            });
        });

    });
});



app.listen(3000);
