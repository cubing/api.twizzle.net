// https://github.com/denoland/deno/issues/1657#issuecomment-694385514

import {
  copySync,
  ensureFileSync,
  existsSync,
} from "https://deno.land/std@0.85.0/fs/mod.ts";

// maybe a Deno flag like --persistent-storage would be useful in the future
// https://storage.spec.whatwg.org/#persistence
// interface: https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface
export default class Storage {
  // Can't use privat fields and Proxy(), things will crash hard, see
  // https://disq.us/url?url=https%3A%2F%2Fgithub.com%2Ftc39%2Fproposal-class-fields%2Fissues%2F106%3ACgK5-2pGsZhNCXXqGKGy2OO0PwI&cuid=611304
  //#entries;

  constructor(path) {
    // should this even be configurable?
    Reflect.defineProperty(this, "path", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: path || `${Deno.cwd()}/.tmp/localStorage.json`,
    });

    Reflect.defineProperty(this, "entries", {
      configurable: false,
      enumerable: true,
      writable: true,
      value: null,
    });

    Reflect.defineProperty(this, "read", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function () {
        if (existsSync(this.path)) {
          try {
            return Object.entries(JSON.parse(Deno.readTextFileSync(this.path)));
          } catch (err) {
            // check for backup
            if (existsSync(`${this.path}.backup`)) {
              try {
                return Object.entries(
                  JSON.parse(Deno.readTextFileSync(`${this.path}.backup`))
                );
              } catch (err) {
                return [];
              }
            }
          }
        } else {
          return [];
        }
      },
    });

    Reflect.defineProperty(this, "write", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function () {
        ensureFileSync(this.path);
        // create backup in case something goes wrong while writing the file
        // Deno crashing mid-write or something similar can cause corrupted JSON!
        copySync(this.path, `${this.path}.backup`, {
          overwrite: true,
          preserveTimestamps: true,
        });
        // persist to disk...
        Deno.writeTextFileSync(
          this.path,
          JSON.stringify(Object.fromEntries(this.entries))
        );
      },
    });

    Reflect.defineProperty(this, "delete", {
      configurable: false,
      enumerable: false,
      writable: false,
      value: function () {
        [this.path, `${this.path}.backup`].forEach((path) => {
          existsSync(path) && Deno.removeSync(path);
        });
      },
    });

    /**
     * Returns the number of key/value pairs. In the Browser this is enumerable!
     * Plus setting length on Browser localStorage with `localStorage['length'] = x`
     * creates an actual entry with key 'length'...but then the console.log() representation
     * changes and contains an entries property.
     *
     *
     * @returns {Number}
     */
    Reflect.defineProperty(this, "length", {
      configurable: true,
      enumerable: true,
      writeable: true,
      get: function () {
        return this.entries.size;
      },
    });

    this.entries = new Map(this.read());

    return new Proxy(this, {
      get(target, key, receiver) {
        if (!target[key]) {
          return target.getItem(key);
        }
        return Reflect.get(target, key, receiver);
      },
      set(target, key, value) {
        // redirect setting any properties on the Storage object itself to the Map
        target.setItem(key, value);

        return true;
      },
      deleteProperty(target, key) {
        target.removeItem(key);

        return true;
      },
    });
  }

  /**
   * Returns the name of the nth key, or null if n is greater than or equal to
   * the number of key/value pairs.
   *
   * @param {Number} index
   *
   * @returns {String}
   */
  key(index) {
    return index >= this.entries.length
      ? null
      : [...this.entries.keys()][index];
  }
  /**
   * Returns the current value associated with the given key,
   * or null if the given key does not exist.
   *
   * @param {String} key
   *
   * @returns {String}
   */

  getItem(key) {
    if (this.entries.has(key)) {
      return String(this.entries.get(key));
    }
    return null;
  }
  /**
   * Sets the value of the pair identified by key to value, creating a new key/value pair
   * if none existed for key previously.
   * TODO: Throws a "QuotaExceededError" DOMException exception if the new value couldn't be set.
   * (Setting could fail if, e.g., the user has disabled storage for the site,
   * or if the quota has been exceeded.)
   * TODO: Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * @note Browser's behaviour is a bit strange, with localStorage[<key>] = <value> it returns
   *       the value, but when using localStorage.setItem(<key>) it always returns undefined.
   *
   * @param {String} key
   * @param {any} value
   *
   * @returns undefined
   */

  setItem(key, value) {
    this.entries.set(key, String(value));
    this.write();
  }
  /**
   * Removes the key/value pair with the given key, if a key/value pair with the given key exists.
   * TODO: Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * @note Browser's behaviour is a bit strange, with delete localStorage[<key>] it returns true
   *       for known and unknown keys, but when using localStorage.removeItem(<key>) it always
   *       returns undefined, regardless if the key was known or not.
   *
   * @param {String} key
   *
   * @returns undefined
   */

  removeItem(key) {
    this.entries.delete(key);
    this.write();
  }
  /**
   * Removes all key/value pairs, if there are any.
   * TODO: Dispatches a storage event on Window objects holding an equivalent Storage object.
   *
   * @returns undefined
   */

  clear() {
    this.entries.clear();
    this.delete();
  }
}
