# JSON+HAL REST Data Provider For React-Admin

JSON+HAL REST Data Provider for [react-admin](https://github.com/marmelab/react-admin), the frontend framework for building admin applications on top of REST/GraphQL services.

![react-admin demo](http://static.marmelab.com/react-admin.gif)

## Installation

```sh
npm install --save ra-data-json-hal
```

## REST Dialect

This Data Provider fits REST APIs using simple GET parameters for filters and sorting. This is the dialect used for instance in [FakeRest](https://github.com/marmelab/FakeRest).

| REST verb            | API calls
|----------------------|----------------------------------------------------------------
| `GET_LIST`           | `GET http://example.com/api/posts?name.dir=DESC&page=1&published=true&size=10&sort=name`
| `GET_ONE`            | `GET http://example.com/api/posts/50`
| `CREATE`             | `POST http://example.com/api/posts`
| `UPDATE`             | `PUT http://example.com/api/posts/50`
| `DELETE`             | `DELETE http://example.com/api/posts/50`
| `GET_MANY`           | Makes a GET_ONE for each `id` request.
| `GET_MANY_REFERENCE` | `GET http://example.com/api/posts/50/comments`

**Note**: This data provider expects a `Location` header to be present in the
response for the requests made using the `POST` or `PATCH` methods.

```
Location: http://example.com/api/posts/50
```

## Usage

```jsx
// in src/App.js
import React from 'react';
import { Admin, Resource } from 'react-admin';
import jsonHalRestProvider from 'ra-data-json-hal';

import { PostList } from './posts';

const App = () => (
    <Admin dataProvider={jsonHalRestProvider('http://path.to.my.api/')}>
        <Resource name="posts" list={PostList} />
    </Admin>
);

export default App;
```

### Adding Custom Headers

The provider function accepts an HTTP client function as second argument. By default, they use react-admin's `fetchUtils.fetchJson()` as HTTP client. It's similar to HTML5 `fetch()`, except it handles JSON decoding and HTTP error codes automatically.

That means that if you need to add custom headers to your requests, you just need to *wrap* the `fetchJson()` call inside your own function:

```jsx
import { fetchUtils, Admin, Resource } from 'react-admin';
import jsonHalRestProvider from 'ra-data-json-hal';

const httpClient = (url, options = {}) => {
    if (!options.headers) {
        options.headers = new Headers({ Accept: 'application/json' });
    }
    // add your own headers here
    options.headers.set('X-Custom-Header', 'foobar');
    return fetchUtils.fetchJson(url, options);
}
const dataProvider = jsonHalRestProvider('http://localhost:3000', httpClient);

render(
    <Admin dataProvider={dataProvider} title="Example Admin">
       ...
    </Admin>,
    document.getElementById('root')
);
```

Now all the requests to the REST API will contain the `X-Custom-Header: foobar` header.

**Tip**: The most common usage of custom headers is for authentication. `fetchJson` has built-on support for the `Authorization` token header:

```jsx
const httpClient = (url, options = {}) => {
    options.user = {
        authenticated: true,
        token: 'SRTRDFVESGNJYTUKTYTHRG'
    }
    return fetchUtils.fetchJson(url, options);
}
```

Now all the requests to the REST API will contain the `Authorization: SRTRDFVESGNJYTUKTYTHRG` header.

## License

This data provider is licensed under the MIT License, and sponsored by [applaudo studios](https://applaudostudios.com/).
