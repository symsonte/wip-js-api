import {api} from "@yosmy/request";
import {Platform} from "@yosmy/ui";
import uniq from "lodash/uniq";
import uniqWith from "lodash/uniqWith";

const server = __DEV__ ? 'http://192.168.1.14' : 'https://api.prod.com';

const hash = (str) => {
    let hash = 0, i, chr;
    
    if (str.length === 0) { 
        return hash;
    }
    
    for (i = 0; i < str.length; i++) {
        chr = str.charCodeAt(i);
    
        hash = ((hash << 5) - hash) + chr;
    
        hash |= 0; // Convert to 32bit integer
    }
    
    return hash;
};


const Api = {
    addUser: (
        firstname,
        lastname,
        onReturn,
        onUserInvalidFirstnameException,
        onUserInvalidLastnameException,
        onConnectionException,
        onServerException,
        onUnknownException
    ) => {
        const resolve = (response, onReturn, onUserInvalidFirstnameException, onUserInvalidLastnameException, onUnknownException) => {
            const {code, payload} = response;
        
            switch (code) {
                case 'return':
                    onReturn(payload);
        
                    break;
                case 'user.invalid-firstname-exception':
                    onUserInvalidFirstnameException(payload);
                    
                    break;
                case 'user.invalid-lastname-exception':
                    onUserInvalidLastnameException(payload);
                    
                    break;
                default:
                    onUnknownException(response);
            }
        };
        
        api(
            server + '/add-user',
            null,
            null,
            {
                firstname: firstname,
                lastname: lastname
            }
            
        )
            .then((response) => {
                resolve(response, onReturn, onUserInvalidFirstnameException, onUserInvalidLastnameException, onUnknownException);    
            })
            .catch((response) => {
                const {code} = response;
                
                switch (code) {
                    case 'connection':
                        onConnectionException();
                    
                        break;
                    case 'server':
                        onServerException();
                    
                        break;
                    default:
                        onUnknownException(response);
                }
            });
        
    },
    collectUpdatedUsers: (
        token,
        ids,
        onReturn,
        onConnectionException,
        onServerException,
        onUnknownException
    ) => {
        const resolve = (response, onReturn, onUnknownException) => {
            const {code, payload} = response;
        
            switch (code) {
                case 'return':
                    onReturn(payload);
        
                    break;
                
                default:
                    onUnknownException(response);
            }
        };
        
        Platform.cache.get(`/collect-updated-users`)
            .then((file) => {
                const now = Date.now(); 
                
                let last;
                
                if (file) {
                    const {date} = file;
                    
                    // Cache not expired?
                    if (date + 60000 >= now) {
                        const {table, response} = file;
                    
                        // Just get ids with no cache
                        ids = ids.filter((id) => {
                            return table.indexOf(id) === -1
                        });
                        
                        // All in cache?
                        if (ids.length === 0) {
                            resolve(response, onReturn, onUnknownException);
        
                            return;
                        }
                        // Need some ids 
                        else {
                            // Ok, will call the api with those ids
                            
                            last = null;
                        }
                    }
                    // Cache expired 
                    else {
                        last = date;
                    }
                } else {
                    last = null;
                }
                
                
        api(
            server + '/collect-updated-users',
            null,
            token,
            {
                ids: ids,
                updated: last
            }
            
        )
            .then((response) => {
                
                // Will contain ids, even nonexistent, as a registry of what cache offers
                let table;
                    
                if (file) {
                    const {date} = file;
                    
                    // Cache not expired?
                    if (date + 60000 >= now) {
                        // Priority order: cache, response, nonexistent
                        
                        table = file.table
                            .concat(
                                response.payload.map(({id}) => {
                                    return id;
                                })
                            )
                            .concat(
                                ids
                            );
                        
                        response.payload = file.response.payload
                            .concat(
                                response.payload
                            )
                            .concat(
                                ids.map((id) => {
                                    return {
                                        id: id
                                    }
                                })
                            );
                    }
                    // Cache expired
                    else 
                    {
                        // Priority order: response, cache
                        
                        table = response.payload.map(({id}) => {
                            return id;
                        })
                            .concat(
                                file.table
                            );
                        
                        response.payload = response.payload.concat(
                            file.response.payload
                        );
                    }
                } else {
                    // Priority order: response, nonexistent
                
                    table = response.payload
                        .map(({id}) => {
                            return id;
                        })
                        .concat(
                            ids
                        );
                }
                    
                // Remove duplicated, priority for the first found
                
                table = uniq(table);
                
                response.payload = uniqWith(
                    response.payload,
                    (a, b) => {
                        return a.id === b.id;
                    }
                );
                
                Platform.cache.set(`/collect-updated-users`, {table: table, response: response, date: now}).catch(console.log);
                
                resolve(response, onReturn, onUnknownException);    
            })
            .catch((response) => {
                const {code} = response;
                
                switch (code) {
                    case 'connection':
                        onConnectionException();
                    
                        break;
                    case 'server':
                        onServerException();
                    
                        break;
                    default:
                        onUnknownException(response);
                }
            });
        
            });
        
    },
    collectUsers: (
        token,
        ids,
        onReturn,
        onConnectionException,
        onServerException,
        onUnknownException
    ) => {
        const resolve = (response, onReturn, onUnknownException) => {
            const {code, payload} = response;
        
            switch (code) {
                case 'return':
                    onReturn(payload);
        
                    break;
                
                default:
                    onUnknownException(response);
            }
        };
        
        Platform.cache.get(`/collect-users`)
            .then((file) => {
                if (file) {
                    const {table, response} = file;
                    
                    // Just get ids with no cache
                    ids = ids.filter((id) => {
                        return table.indexOf(id) === -1
                    });
                    
                    // All in cache?
                    if (ids.length === 0) {
                        resolve(response, onReturn, onUnknownException);
        
                        return;
                    }
                }
                
                
        api(
            server + '/collect-users',
            null,
            token,
            {
                ids: ids
            }
            
        )
            .then((response) => {
                
                // Will contain ids, even nonexistent, as a registry of what cache offers
                let table;
                    
                if (file) {
                    // Priority order: cache, request
                
                    table = file.table
                        .concat(
                            ids
                        );
                        
                    response.payload = file.response.payload
                        .concat(
                            response.payload
                        );
                } else {
                    // Priority order: request
                
                    table = ids
                }
                    
                Platform.cache.set(`/collect-users`, {table: table, response: response}).catch(console.log);
                
                resolve(response, onReturn, onUnknownException);    
            })
            .catch((response) => {
                const {code} = response;
                
                switch (code) {
                    case 'connection':
                        onConnectionException();
                    
                        break;
                    case 'server':
                        onServerException();
                    
                        break;
                    default:
                        onUnknownException(response);
                }
            });
        
            });
        
    },
    pickUser: (
        token,
        id,
        onReturn,
        onConnectionException,
        onServerException,
        onUnknownException
    ) => {
        const resolve = (response, onReturn, onUnknownException) => {
            const {code, payload} = response;
        
            switch (code) {
                case 'return':
                    onReturn(payload);
        
                    break;
                
                default:
                    onUnknownException(response);
            }
        };
        
        Platform.cache.get(`/pick-user-${hash(id)}`)
            .then((file) => {
                if (file) {
                    const {response} = file;
                        
                    resolve(response, onReturn, onUnknownException);
                    
                    return;
                }
                
                
        api(
            server + '/pick-user',
            null,
            token,
            {
                id: id
            }
            
        )
            .then((response) => {
                
                Platform.cache.set(`/pick-user-${hash(id)}`, {response: response}).catch(console.log);
                
                resolve(response, onReturn, onUnknownException);    
            })
            .catch((response) => {
                const {code} = response;
                
                switch (code) {
                    case 'connection':
                        onConnectionException();
                    
                        break;
                    case 'server':
                        onServerException();
                    
                        break;
                    default:
                        onUnknownException(response);
                }
            });
        
            });
        
    },
    removeUser: (
        id,
        onReturn,
        onConnectionException,
        onServerException,
        onUnknownException
    ) => {
        const resolve = (response, onReturn, onUnknownException) => {
            const {code, payload} = response;
        
            switch (code) {
                case 'return':
                    onReturn(payload);
        
                    break;
                
                default:
                    onUnknownException(response);
            }
        };
        
        api(
            server + '/remove-user',
            null,
            null,
            {
                id: id
            }
            
        )
            .then((response) => {
                Platform.cache.delete(`/pick-user-${hash(id)}`).catch(console.log);
                
                resolve(response, onReturn, onUnknownException);    
            })
            .catch((response) => {
                const {code} = response;
                
                switch (code) {
                    case 'connection':
                        onConnectionException();
                    
                        break;
                    case 'server':
                        onServerException();
                    
                        break;
                    default:
                        onUnknownException(response);
                }
            });
        
    },
    user: {
        updateFirstname: (
            id,
            firstname,
            onReturn,
            onConnectionException,
            onServerException,
            onUnknownException
        ) => {
            const resolve = (response, onReturn, onUnknownException) => {
                const {code, payload} = response;
            
                switch (code) {
                    case 'return':
                        onReturn(payload);
            
                        break;
                    
                    default:
                        onUnknownException(response);
                }
            };
            
            api(
                server + '/user/update-firstname',
                null,
                null,
                {
                    id: id,
                    firstname: firstname
                }
                
            )
                .then((response) => {
                    resolve(response, onReturn, onUnknownException);    
                })
                .catch((response) => {
                    const {code} = response;
                    
                    switch (code) {
                        case 'connection':
                            onConnectionException();
                        
                            break;
                        case 'server':
                            onServerException();
                        
                            break;
                        default:
                            onUnknownException(response);
                    }
                });
            
        }
    }
};

const WrappedApi = (
    session, 
    token, 
    onConnectionException,
    onServerException,
    onUnknownException
) => {
    return {
        addUser: (
            ...props
        ) => {
            Api.addUser(
                ...props,
                onConnectionException,
                onServerException,
                onUnknownException
            )
        },
        collectUpdatedUsers: (
            ...props
        ) => {
            Api.collectUpdatedUsers(
                token,
                ...props,
                onConnectionException,
                onServerException,
                onUnknownException
            )
        },
        collectUsers: (
            ...props
        ) => {
            Api.collectUsers(
                token,
                ...props,
                onConnectionException,
                onServerException,
                onUnknownException
            )
        },
        pickUser: (
            ...props
        ) => {
            Api.pickUser(
                token,
                ...props,
                onConnectionException,
                onServerException,
                onUnknownException
            )
        },
        removeUser: (
            ...props
        ) => {
            Api.removeUser(
                ...props,
                onConnectionException,
                onServerException,
                onUnknownException
            )
        },
        user: {
            updateFirstname: (
                ...props
            ) => {
                Api.user.updateFirstname(
                    ...props,
                    onConnectionException,
                    onServerException,
                    onUnknownException
                )
            }
        }
    };
};

export default WrappedApi;