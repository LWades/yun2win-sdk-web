'use strict';

var Users = (function(){
    var _instance;

    function Singleton() {
        var _list;
        this.localStorage = usersLocalStorageSingleton.getInstance(this);
        this.remote = usersRemoteSingleton.getInstance(this);

        this.getCurrentUser = function(){
            if(this.localStorage.getCurrentUserId() == null) {
                location.href="index.html";
                throw 'currentUserId is null, pls relogin!';
            }
            if(!_list){
                _list = this.localStorage.getUsers(this.localStorage.getCurrentUserId());
                for(var k in _list){
                    _list[k] = new User(_list[k]);
                }
                var info = this.localStorage.getCurrentUserInfo();
                info.account = info.account || info.email;
                var user = new CurrentUser(info,this);
                _list[user.id] = user;
                user.init();
                this.localStorage.setUsers(_list);
            }
            return this.get(user.id);
        };
        this.get = function(id){
            return _list[id];
        }
        this.getUsers = function(){
            return _list;
        }
        this.create = function(id, name, account, avatarUrl){
            if(this.get(id))
                throw 'can not create the user, because the user is exist';
            else{
                var user = new User({
                    id: id,
                    name: name,
                    account: account,
                    avatarUrl: avatarUrl
                });
                _list[user.id] = user;
                this.localStorage.setUsers(_list);
                return user;
            }
        };

    }
    return{
        getInstance: function(){
            if(!_instance)
                _instance = new Singleton();
            return _instance;
        }
    }
})();

var usersLocalStorageSingleton = (function(){
    var _instance;

    function Singleton(users) {
        var _users = users;

        this.getCurrentUserId = function(){
            return localStorage.getItem('y2wIMCurrentUserId');
        }
        this.setCurrentUserId = function(userId){
            localStorage.setItem('y2wIMCurrentUserId', userId);
        }
        this.removeCurrentId = function(){
            localStorage.removeItem('y2wIMCurrentUserId')
        }
        this.getCurrentUserInfo = function(){
            return JSON.parse(localStorage.getItem(this.getCurrentUserId()));
        }
        this.setCurrentUserInfo = function(user){
            localStorage.setItem(user.id, JSON.stringify(user));
        }
        this.removeCurrentUserInfo = function(){
            delete currentUser.appKey;
            delete currentUser.secret;
            delete currentUser.token;
            delete currentUser.imToken;
            this.setUsers(_users.getUsers());
            localStorage.removeItem(currentUser.id);
        }
        this.getUsers = function(){
            var users = localStorage.getItem(this.getCurrentUserId() + '_users');
            if(!users)
                return {};
            return JSON.parse(users);
        }
        this.setUsers = function(users){
            localStorage.setItem(this.getCurrentUserId() + '_users', JSON.stringify(users));
        };
    }
    return{
        getInstance: function(users, list){
            if(!_instance)
                _instance = new Singleton(users, list);
            return _instance;
        }
    }
})();

var usersRemoteSingleton = (function(){
    var _instance;

    function Singleton(users) {
        var _users = users;
        this.register = function(account, password, name, cb){
            cb = cb || nop;
            var url = 'users/register';
            var params = {
                email: account,
                password:MD5(password),
                name: name
            };
            baseRequest.post(url, params, null, cb);
        };
        this.login = function(account, password, cb){
            cb = cb || nop;
            var url = 'users/login';
            var params = {
                email: account,
                password:MD5(password)
            };
            baseRequest.post(url, params, null, function(err, data){
                if(err){
                    cb(err);
                    return;
                }
                data._login={a:account,p:MD5(password)};
                _users.localStorage.setCurrentUserId(data.id);
                _users.localStorage.setCurrentUserInfo(data);
                cb(null, data);
            });
        }
        this.search = function(account, token, cb){
            cb = cb || nop;
            var url = 'users?filter_term=' + account;
            baseRequest.get(url, null, currentUser.token, function(err, obj){
                if(err){
                    cb(err);
                    return;
                }
                if(obj.total_count){
                    var info = obj.entries[0];
                    var user = _users.get(info.id);
                    if(!user)
                        user = _users.create(info.id, info.name, info.email, info.avatarUrl);
                    cb(null, user);
                }
                else
                    cb(null, null);
            });
        };
        this.get = function(id, token, cb){
            cb = cb || nop;
            var url = 'users/' + id;
            baseRequest.get(url, null, currentUser.token, function(err, obj){
                if(err){
                    cb(err);
                    return;
                }
                if(obj){
                    var info =obj;
                    var user = _users.get(info.id);

                    if(!user)
                        user = _users.create(info.id, info.name, info.email, info.avatarUrl);
                    else{
                        user.id=info.id;
                        user.name=info.name;
                        user.account=info.email;
                        user.avatarUrl=info.avatarUrl;
                        user.date=new Date();
                        if(!user.avatarUrl || user.avatarUrl.indexOf('/images/default.jpg') >= 0)
                            user.avatarUrl = ' ';
                        _users.localStorage.setUsers(_users.getUsers());
                    }
                    cb(null, user);
                }
                else
                    cb(null, null);
            });
        };
    }
    return{
        getInstance: function(users){
            if(!_instance)
                _instance = new Singleton(users);
            return _instance;
        }
    }
})();

var User = function(obj){
    this.id = obj['id'];
    this.name = obj['name'];
    this.pinyin = obj['pinyin'];
    this.account = obj['account'] || obj['email'];
    this.avatarUrl = obj['avatarUrl'] || ' ';
    if(this.avatarUrl.indexOf('/images/default.jpg') >= 0)
        this.avatarUrl = ' ';
    this.role = obj['role'];
    this.jobTitle = obj['jobTitle'];
    this.phone = obj['phone'];
    this.address = obj['address'];
    this.status = obj['status'];
    this.createdAt = obj['createdAt'] || globalMinDate;
    this.updatedAt = obj['updatedAt'] || globalMinDate;
};
User.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        account: this.account,
        avatarUrl: this.avatarUrl,
        role: this.role,
        jobTitle: this.jobTitle,
        phone: this.phone,
        address: this.address,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    }
};
User.prototype.getAvatarUrl = function(){
    if(this.avatarUrl && $.trim(this.avatarUrl) != '' && $.trim(this.avatarUrl) != '..')
        return parseAttachmentUrl(this.avatarUrl,currentUser.token);
        //return config.baseUrl + this.avatarUrl + '?access_token=' + currentUser.token;
    return null;
};

var CurrentUser = function(obj,users){
    User.call(this, obj);

    this.users=users;
    this._login=obj._login;
    this.appKey = obj['key'];
    this.secret = obj['secret'];
    this.token = obj['token'];
    this.imToken = obj['imToken'];
    this.userConversations = new UserConversations(this);
    this.contacts = new Contacts(this);
    this.emojis = new Emojis(this);
    this.sessions = new Sessions(this);
    this.userSessions = new UserSessions(this);
    this.attchments = new Attachments(this);
    this.remote = currentUserRemoteSingleton.getInstance(this);
    this.currentSession;
    this.y2wIMBridge;

};
CurrentUser.prototype = new User({});
CurrentUser.prototype.init = function(){
    this.userConversations.init();
    this.contacts.init();
    this.sessions.init();
    this.userSessions.init();
    this.emojis.init();
};
CurrentUser.prototype.logout = function(cb){
    try {
        this.y2wIMBridge.disconnect();
    }catch(e){}
    Users.getInstance().localStorage.removeCurrentUserInfo();
    Users.getInstance().localStorage.removeCurrentId();
    cb();
};
CurrentUser.prototype.relogin=function(cb){
    if(!this._login || !this._login.a || !this._login.p){
        cb("没有记录登陆信息,重新登陆");
        return;
    }
    var url = 'users/login';
    var params = {
        email: this._login.a,
        password:this._login.p
    };
    var that=this;
    baseRequest.post(url, params, null, function(err, obj){
        if(err){
            cb(err);
            return;
        }

        that.appKey = obj['key'];
        that.secret = obj['secret'];
        that.token = obj['token'];
        var data=that.users.localStorage.getCurrentUserInfo();
        data.key=obj.key;
        data.secret=obj.secret;
        data.token=obj.token;
        that.users.localStorage.setCurrentUserInfo(data);


        cb(null, that.token);
    });

};
CurrentUser.prototype.toJSON = function(){
    return {
        id: this.id,
        name: this.name,
        pinyin: this.pinyin,
        account: this.account,
        avatarUrl: this.avatarUrl,
        role: this.role,
        jobTitle: this.jobTitle,
        phone: this.phone,
        address: this.address,
        status: this.status,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        key: this.appKey,
        secret: this.secret,
        token: this.token,
        imToken: this.imToken
    }
};

CurrentUser.prototype.y2wIMInit = function(opts){
    var that = this;
    this.remote.syncIMToken(function(err){
        if(err){
            console.log(err);
            setTimeout(function(){
                that.y2wIMInit(opts)
            },5000);
            return;
        }
        that.y2wIMBridge = new y2wIMBridge(that,opts);
        console.log("y2wIMBridge is ready");
    })
};

var currentUserRemoteSingleton = (function(){
    var _instance;

    function Singleton(user) {
        var _user = user;
        this.syncIMToken = function(cb){
            cb = cb || nop;
            var url = 'oauth/token';
            var params = {
                grant_type: 'client_credentials',
                client_id: _user.appKey,
                client_secret: _user.secret
            };
            var that=this;
            y2wAuthorizeRequest.post(url, params, _user.token, function(err, data){
                if(err && err.status == 400){
                    y2w.relogin(function(error,token){
                        if(error)
                            return cb(error);
                        that.syncIMToken(cb);
                    });
                    return;
                }
                if(err){
                    cb(err);
                    return;
                }
                _user.imToken = data.access_token;
                cb(null, _user.imToken);
            })
        };
        this.store = function(cb){
            cb = cb || nop;
            var url = 'users/' + _user.id;
            var params = {
                email: _user.account,
                name: _user.name,
                role: _user.role,
                jobTitle: _user.jobTitle,
                phone: _user.phone,
                address: _user.address,
                status: _user.status,
                avatarUrl: _user.avatarUrl
            };
            baseRequest.put(url, params, _user.token, function(err){
                if(err){
                    cb(err);
                    return;
                }
                Users.getInstance().localStorage.setCurrentUserInfo(_user);
                Users.getInstance().localStorage.setUsers(Users.getInstance().getUsers());
                cb(null);
            })
        };
        this.setPassword=function(psw,npsw,cb){
            cb = cb || nop;
            var url= 'users/setPassword';
            var params={
                oldPassword:MD5(psw),
                password:MD5(npsw)
            };
            baseRequest.post(url, params, _user.token, function(err){
                if(err){
                    if(err.responseText){
                        try {
                            var error = JSON.parse(err.responseText);
                            cb(error.message)
                        }
                        catch(e){
                            cb(err);
                        }
                    }
                    else {
                        cb(err);
                    }
                    return;
                }

                cb(null);
            })

        };
    }
    return{
        getInstance: function(user){
            if(!_instance)
                _instance = new Singleton(user);
            return _instance;
        }
    }
})();