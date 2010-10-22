# coding: utf-8

from pymongo import Connection


def get_connection(*args, **kwargs):
    return Connection(*args, **kwargs)

def get_db(connection=None):
    if not connection:
        connection = get_connection()
    return connection['voton']

