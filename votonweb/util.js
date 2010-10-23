
/* Checks whether the given ``obj`` is empty (aka, ``{}``) */
exports.is_empty = function(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true;
}

