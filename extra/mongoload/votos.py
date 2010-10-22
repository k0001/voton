#!/usr/bin/env python2
# coding: utf-8

import optparse
import codecs
import csv
import locale
import logging
import re
import sys

from functools import partial
from itertools import izip

from _base import get_connection, get_db


logging.basicConfig(level=logging.WARNING)
log = logging.getLogger('mongoload.votos')

_RE_VOTACION_ACTA = re.compile(
    r'^(?P<periodo>\d{3})(?P<tipo>PT|ET|OT|OE|EE|OP)(?P<sesion>\d{2})_(?P<num>\d{2})_R(?P<reunion>\d{2})$')

VOTO_RESULTS = {
    u"AFIRMATIVO"   : 0,
    u"NEGATIVO"     : 1,
    u"ABSTENCION"   : 2,
    u"AUSENTE"      : 3,
    u"?"            : 5, # unknown
    u""             : 5, # unknown
}


def db_save_voto(db, voto):
    c = db['votos']

    #v = c.find_one(voto)
    v = None
    if v:
        log.debug(u"Voto already exists, skipping: %s" % v)
    else:
        _id = c.save(voto)
        log.debug(u"Saved voto %s: %s" % (_id, voto))
        return _id


def ivotos_from_csv(year, fname, csv_reader=None, encoding='utf-8'):
    log.info(u"Updating year %s from votos csv %s" % (year, fname))
    with open(fname, 'r') as f:
        if not csv_reader:
            csv_reader = csv.reader
        cr = csv_reader(f)
        keys = [k.decode(encoding) for k in next(cr)]
        assert keys[:3] == [u'nombre', u'bloque', u'provincia']
        vactas = []
        for va in keys[3:]:
            m = _RE_VOTACION_ACTA.match(va)
            if not m:
                log.warning(u"Skipping wrong formatted Votacion Acta: '%s'" % va)
                vactas.append(None)
                continue
            d = m.groupdict()
            vactas.append({
                'year': year,
                'periodo': int(d['periodo']),
                'tipo': d['tipo'],
                'sesion': int(d['sesion']),
                'num':int(d['num']),
                'reunion': int(d['reunion']) })
        for row in cr:
            row = [k.decode(encoding) for k in row]
            full_name = row[0]
            log.info(u"Parsing %d votes from %s..." % (year, full_name))
            voto_base = {
                u'full_name': full_name,
                u'bloque': row[1],
                u'distrito': row[2] }
            for vacta, result in izip(vactas, row[3:]):
                if not vacta:
                    continue
                if not result in VOTO_RESULTS:
                    log.warning(u"Voto result '%s' invalid. Skipping'" % result)
                    continue
                voto = { 'result': VOTO_RESULTS[result], 'acta': vacta }
                voto.update(voto_base)
                yield voto



def parse_args():
    parser = optparse.OptionParser(usage=u"usage: %prog [options] CSV_FILE")

    parser.add_option('-v', '--verbose',
                      action='store_true', dest='verbose',
                      help=u"verbose output")
    parser.add_option('--debug',
                      action='store_true', dest='debug',
                      help=u"debug output")

    # MongoDB
    parser.add_option('--host',
                      action='store', dest='mongo_host',
                      default="localhost",
                      help=u"MongoDB server host")
    parser.add_option('--port',
                      action='store', type='int', dest='mongo_port',
                      default=27017,
                      help=u"MongoDB server port")

    parser.add_option('-y', '--year',
                      action='store', type='int', dest='year',
                      help=u"YEAR of the votes to be imported")
    parser.add_option('--csv-delimiter',
                      action='store', dest='csv_delimiter',
                      default=",",
                      help=u"csv cells delimiter character",
                      metavar="DELIMITER")

    opts, args = parser.parse_args()
    if not (opts.year and args):
        parser.print_help()
        sys.exit(1)

    return opts, args


if __name__ == '__main__':
    opts, args = parse_args()

    if opts.debug:
        log.setLevel(logging.DEBUG)
    elif opts.verbose:
        log.setLevel(logging.INFO)


    db = get_db(get_connection(opts.mongo_host, opts.mongo_port))
    csv_reader = partial(csv.reader, delimiter=opts.csv_delimiter)

    for voto in ivotos_from_csv(opts.year, args[0], csv_reader):
        db_save_voto(db, voto)

