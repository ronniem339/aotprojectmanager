// creators-hub/js/utils/objectUtils.js

/**
 * Recursively removes properties with undefined values from an object.
 * This is crucial for cleaning data before sending it to Firestore,
 * which does not support 'undefined' field values.
 * @param {any} obj The object or value to clean.
 * @returns {any} A new object or value with undefined properties removed.
 */
window.cleanObject = (obj) => {
  // If it's not an object (or is null), return it as is.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // If it's an array, recursively clean each item and filter out any
  // resulting undefined items (though cleaning should prevent this).
  if (Array.isArray(obj)) {
    return obj.map(item => window.cleanObject(item)).filter(item => item !== undefined);
  }

  // If it's an object, create a new object and copy over only the defined values.
  const newObj = {};
  for (const key in obj) {
    // Ensure the key belongs to the object itself, not its prototype chain.
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // Only include the key in the new object if its value is not undefined.
      if (value !== undefined) {
        // Recursively clean the value in case it's a nested object or array.
        newObj[key] = window.cleanObject(value);
      }
    }
  }
  return newObj;
};
