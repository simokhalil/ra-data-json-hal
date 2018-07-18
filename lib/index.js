'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.generateHttpClient = generateHttpClient;

var _fetch = require('./fetch');

var _reactAdmin = require('react-admin');

var _constants = require('./constants');

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function len(object) {
  return Array.isArray(object) ? object.length : 0;
}

/**
 * @param {object} params
 * @returns {string}
 */
function getQueryParamsFromReactAdminParams() {
  var params = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  if (!params || Object.keys(params).length === 0) {
    return '';
  }
  var _params$pagination = params.pagination;
  _params$pagination = _params$pagination === undefined ? {} : _params$pagination;
  var page = _params$pagination.page,
      size = _params$pagination.perPage,
      _params$sort = params.sort;
  _params$sort = _params$sort === undefined ? {} : _params$sort;
  var sort = _params$sort.field,
      order = _params$sort.order,
      filter = params.filter;

  var requestParameters = _extends(_defineProperty({
    /**
     * The API starts pagination at 0.
     */
    page: page ? page - 1 : undefined,
    size: size,
    sort: sort
  }, sort + '.dir', order), filter);
  return '?' + (0, _fetch.queryParameters)(requestParameters);
}

/**
 * react-admin uses a different structure for each "type" of request.
 *
 * The GET_LIST type uses the following structure:
 *
 *    {
 *      sort: {
 *        field: string,
 *        order: string // oneOf 'ASC' or 'DESC'
 *      },
 *      pagination: {
 *        page: number,
 *        perPage: number,
 *      },
 *      filter: {}, // keys to realize extra "filters"
 *     }
 *
 * The HAL+JSON request for GET_LIST accepts the following query parameters:
 * page, size, sort, {sort_value}.dir. The "{sortValue}.dir" should have one of
 * the following values: 'asc' or 'desc'.
 *
 *
 * @param {string} apiUrl The base URL for the API.
 * @param {object} httpClient The client used for the request, usually an instance of fetch.
 * @param {object} type The type of request to fetch eg. "GET_ONE"
 * @param {string} resource The name of the resource to fetch eg. "deals"
 * @param {object} params The parameters for the request.
 * @returns {object} The http request object.
 */
function convertHttpDataProviderRequestToHttpRequest(apiUrl, httpClient, type, resource, params) {
  var baseRequestUrl = apiUrl + '/' + resource;
  switch (type) {
    case _reactAdmin.GET_LIST:
      return {
        url: '' + baseRequestUrl + getQueryParamsFromReactAdminParams(params),
        options: {}
      };
    case _reactAdmin.GET_ONE:
      return { url: baseRequestUrl + '/' + params.id, options: {} };
    case _reactAdmin.CREATE:
      return {
        url: '' + baseRequestUrl,
        options: {
          method: 'POST',
          body: JSON.stringify(params.data)
        }
      };
    case _reactAdmin.UPDATE:
      return {
        url: baseRequestUrl + '/' + params.id,
        options: {
          method: 'PUT',
          body: JSON.stringify(params.data)
        }
      };
    case _reactAdmin.DELETE:
      return {
        url: baseRequestUrl + '/' + params.id,
        options: {
          method: 'DELETE'
        }
      };
    case _reactAdmin.GET_MANY_REFERENCE:
      return {
        url: apiUrl + '/' + params.target + '/' + params.id + '/' + resource + getQueryParamsFromReactAdminParams(params)
      };
    default:
      throw new Error('Not Implemented');
  }
}

function converHttpResponseToDataProvider(response, type, resource, params) {
  var json = response.json,
      headers = response.headers;

  switch (type) {
    case _reactAdmin.GET_LIST:
      return {
        data: json[_constants.EMBEDDED_KEY][resource],
        total: json[_constants.PAGINATION_KEY]["totalElements"]
      };
    case _reactAdmin.GET_MANY_REFERENCE:
      var target_reference_list = json[_constants.EMBEDDED_KEY][resource];
      return {
        data: target_reference_list,
        total: len(target_reference_list)
      };
    case _reactAdmin.GET_ONE:
      return { data: json };
    case _reactAdmin.UPDATE:
      return { data: _extends({ id: params.id }, params.data) };
    case _reactAdmin.CREATE:
      return {
        data: json
      };
    case _reactAdmin.DELETE:
      return { data: { id: params.id } };
    default:
      throw new Error('Not Implemented');
  }
}

function requestMany(apiUrl, httpClient, resource, params) {
  var options = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : {};
  var responseTransformer = arguments[5];

  return Promise.all(params.ids.map(function (id) {
    return httpClient(apiUrl + '/' + resource + '/' + id, options);
  })).then(responseTransformer);
}

/**
 * Request n entities by their ids.
 *
 * @param {string} apiUrl
 * @param {object} httpClient
 * @param {string} resource
 * @param {object} params
 * @param {string[]} params.ids Assumes that instead of ids, we receive links.
 * @return {promise}
 */
function getMany(apiUrl, httpClient, resource, params) {
  var _params$ids = params.ids,
      ids = _params$ids === undefined ? [] : _params$ids,
      otherParams = _objectWithoutProperties(params, ['ids']);

  if (Array.isArray(params.ids)) {
    return Promise.all(ids.map(function (url) {
      return httpClient('' + url + getQueryParamsFromReactAdminParams(otherParams));
    })).then(function (responses) {
      return {
        data: responses.map(function (_ref) {
          var json = _ref.json;
          return _extends({}, json, {
            id: (0, _fetch.extractIDFromResourceSelfLink)(json[_constants.LINKS_KEY].self.href)
          });
        })
      };
    });
  }
  return Promise.reject('Unable to process request.');
}

/**
 * Request the PATCH for n entities.
 *
 * @param {string} apiUrl
 * @param {object} httpClient
 * @param {string} resource
 * @param {object} params
 * @return {promise}
 */
function updateMany(apiUrl, httpClient, resource, params) {
  return requestMany(apiUrl, httpClient, resource, params, {
    method: 'PUT',
    body: params.data
  }, function (responses) {
    return {
      data: responses.map(function (response) {
        return _extends({
          id: (0, _fetch.extractIDFromResourceSelfLink)(response.headers.get(_constants.LOCATION_HEADER))
        }, params.data);
      })
    };
  });
}

/**
 * Request the DELETE for n entities.
 *
 * @param {string} apiUrl
 * @param {object} httpClient
 * @param {string} resource
 * @param {object} params
 * @return {promise}
 */
function deleteMany(apiUrl, httpClient, resource, params) {
  return requestMany(apiUrl, httpClient, resource, params, {
    method: 'DELETE'
  }, function (responses) {
    return {
      data: responses.map(function (response) {
        return {
          id: (0, _fetch.extractIDFromResourceSelfLink)(response.headers.get(_constants.LOCATION_HEADER))
        };
      })
    };
  });
}

/**
 * @param {string} apiUrl The root url of the API.
 * @param {object} httpClient
 * @return {promise}
 */

exports.default = function (apiUrl) {
  var httpClient = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : _fetch.fetchJson;

  /**
   * @example
   * jsonHalDataProvider(GET_ONE, "countries", { code: 'SV' })
   *
   * @param {string} type The react-admin request type, eg. GET_LIST
   * @param {string} resource The name of the resource to fetch, eg. "countries"
   * @param {string} params The params for the request
   * @returns {Promise}
   */
  return function (type, resource, params) {
    if (type === _reactAdmin.GET_MANY) {
      return getMany(apiUrl, httpClient, resource, params);
    }
    if (type === _reactAdmin.UPDATE_MANY) {
      return updateMany(apiUrl, httpClient, resource, params);
    }
    if (type === _reactAdmin.DELETE_MANY) {
      return deleteMany(apiUrl, httpClient, resource, params);
    }

    var _convertHttpDataProvi = convertHttpDataProviderRequestToHttpRequest(apiUrl, httpClient, type, resource, params),
        url = _convertHttpDataProvi.url,
        options = _convertHttpDataProvi.options;

    return httpClient(url, options, resource, type).then(function (response) {
      return converHttpResponseToDataProvider(response, type, resource, params);
    });
  };
};

function generateHttpClient(url, options) {}