// Copyright 2012 Constantine Sapuntzakis
//

if (typeof csapuntz == "undefined") {
    var csapuntz = {};
}

csapuntz.siteblock = (function () {
  var sbself = {
    read_options : function(stg) {
       var opts = {};

       if (stg === undefined) {
         stg = localStorage;
       }

       if ("settings" in stg) {
         opts = JSON.parse(stg.settings);
       }

       if ("siteblock_list" in stg) {
         opts.rules = stg.siteblock_list;
       }

       if (! ("rules" in opts)) 
          opts.rules = "";

       if (! ("allowed" in opts))
          opts.allowed = 0;

       if (! ("period" in opts))
          opts.period = 1440;

       return opts;
    },

    write_options : function(opts, stg) {
       if (stg === undefined) {
          stg = localStorage;
       } 

       stg.settings = JSON.stringify(opts);
       if ("siteblock_list" in stg)
           delete stg.siteblock_list;
    },

    newUsageTracker : function() {
       var time_cb = function () {
            var d = new Date();
          
            return d.getTime() / 1000;
       };

       var time_allowed = 0;
       var time_period = 3600;

       var last_used_day = (new Date()).getDay();
       var time_used_today = 0;

       var queue = [];
       var last_start = -1;
       
       var clear_queue = function (now) {
         while( ( queue.length > 0 ) && ( queue[0].end < now - time_period ) )
            queue.shift();
       };

       var get_time_used = function() {
             let now = time_cb();
             clear_queue(now);

             let prior_time_used = 0;
             for( const interval of queue ){
               if( interval.end - interval.length < now - time_period )
                  prior_time_used += interval.end - (now - time_period);
               else
                  prior_time_used += interval.length;
             }

             // If we're in an existing interval, count it
             const curr_usage = (last_start !== -1) ? (now - last_start) : 0;

             return (prior_time_used + curr_usage);
       };

       var add_to_daily_usage = function(time_used) {
            let today = (new Date()).getDay();
            if (today !== last_used_day) {
               last_used_day = today;
               time_used_today = time_used;
            } else {
               time_used_today += time_used;
            }
       };

       var formatTime = function(seconds) {
          return (new Date(seconds * 1000).toISOString().substr(11, 8));
       };

       return {
          start: function() {
             last_start = time_cb();
             clear_queue(last_start);

             return function() {
               const now = time_cb();
               const time_used = now-last_start;
               if( time_used > 3 )  //To avoid negligible fragments
                  queue.push({length: time_used, end: now});
               add_to_daily_usage(time_used);
               last_start = -1;
             };
          },
         
          allowed: function() {
             return get_time_used() < time_allowed; 
          },

          setInterval : function(allowed, period) {
            time_allowed = allowed * 60;
            time_period = period * 60;
          },

          setTimeCallback : function(new_cb) {
            time_cb = new_cb;
          },

          getState : function() {
            return {
              "last_used_day" : last_used_day,
              "time_used_today" : time_used_today,
              "time_used" : get_time_used(),
              "queue" : queue,
              "last_start" : last_start
            };
          },

          setState : function(st) {
             last_used_day = st.last_used_day;
             time_used_today = st.time_used_today;
             last_start = -1;
             
             if( typeof st.queue === 'undefined' ){
               queue = [];
             } else {
               queue = JSON.parse(JSON.stringify(st.queue));  //Deep copying, maybe unnecessary?!
             }
          },

          till : function() {
            let x = -1;
            let intervalSum = 0;
            for( const interval of queue ){
               intervalSum += interval.length;
               if( intervalSum >= 60 ){
                  x = interval.end;
                  break;
               }
            }
            if( x === -1 && intervalSum !== 0 )
               x = queue[queue.length-1].end;
            
            //To handle a race condition where a new interval is just about to be pushed onto the queue
            if( x === -1 && last_start !== -1 ){
               x = time_cb();
            }
            
            if( x === -1 )
               return "Already available";
            else {
               const tzOffset = (new Date()).getTimezoneOffset()*60;
               return formatTime(x + time_period - tzOffset);
            }
          },

          time_used_today : function() {
             const curr_usage = (last_start !== -1) ? (time_cb() - last_start) : 0;
             return formatTime(time_used_today + curr_usage);
          }
       };
    },

    newSiteBlock : function() {
      var path_white;
      var path_black;

      var tabState = {};
      var ref = 0;

      var ut = sbself.newUsageTracker();
      var endfunc = function() {};
      
      var get_tracked_tabs = function() {
         var t = [];

         for (var v in tabState) {
            if (v.substring(0, 3) === "Tab")
               t.push(Number(v.substring(3)));
         }

         return t;
      };

      var delete_tab_info = function(tabid) {
         var tabstr = "Tab" + tabid;
         delete tabState[tabstr];
      };

      var get_tab_info = function(tabid) {
         var tabstr = "Tab" + tabid;
         if (tabState[tabstr] === undefined) {
            tabState[tabstr] = { blocked: false };
         } 

         return tabState[tabstr];
      };

      var self = {
         updatePaths : function(paths) {
            if (paths === undefined)
              return;

            paths = paths.split("\n");
            path_white = [];
            path_black = [];

            for (var i = 0 ; i < paths.length; ++i) {
                var p = paths[i];
                if (p.match(/^\s*$/)) {
                } else {
                   var add = path_black;	    
                   if (p[0] === '+') {
                      p = p.substr(1);
                      add = path_white;
                   }
                   p = p.replace('.', '\\.');
                   p = p.replace('*', '.*');
                   add.push(new RegExp(p, 'ig'));
                }
            }
         },

         isBlocked : function(url) {
            var blocked = false;

            if (url !== undefined && url.match(/https?:/)) {
               var p;
               for (p in path_black) {
                     if (url.search(path_black[p]) !== -1) {
                         blocked = true;
                         break;
                     }
               }
               for (p in path_white) {
                     if (url.search(path_white[p]) !== -1) {
                         blocked = false;
                         break;
                     }
               }
            }

            return blocked;
         },  // isBlocked
        
         setAllowedUsage : ut.setInterval,

         setTimeCallback : ut.setTimeCallback,

         getState : function() {
            return {
                "ut" : ut.getState()
            };
         },

         setState : function(st) {
            if ("ut" in st) {
                ut.setState(st.ut);
            }
         },

         blockThisTabChange : function(tabid, url) {
            var ti = get_tab_info(tabid);
            var blocked = (url !== null) ? self.isBlocked(url) : false;
            var allowed = ut.allowed();

            if (!ti.blocked && blocked) {
               ref = ref + 1;
               if (ref === 1 && allowed) {
                  // Start the clock running
                  endfunc = ut.start();
               } 
            } else if (ti.blocked && !blocked) {
               ref = ref - 1;
               if (ref === 0) {
                  endfunc();
                  endfunc = function() {};
               }
            }

            if (url === null) {
                delete_tab_info(tabid);
            } else {
                ti.url = url;
                ti.blocked = blocked;
            }

            return blocked && !allowed;
         },

         deref : function(tabid) {
            var ti = get_tab_info(tabid);
            if (ti.blocked) {
               ref = ref - 1;
               if (ref === 0) {
                  endfunc();
                  endfunc = function() {};
               }
            }
         },

         reRefIfNeeded : function(tabid) {
            var ti = get_tab_info(tabid);
            if (ti.blocked) {
               ref = ref + 1;
               if (ref === 1) {
                  // Start the clock running
                  endfunc = ut.start();
               } 
            }
         },

         getBlockedTabs : function() {
            if (ut.allowed()) {
                return [];
            }

            var tabs = get_tracked_tabs();
            var ret = [];
            var i;
            for (i = 0; i < tabs.length; ++i) {
                var ti = get_tab_info(tabs[i]);

                if (ti.blocked)
                    ret.push( { id : tabs[i], url : ti.url } );
            }
            return ret;
         },

         till : function() {
            return ut.till();
         },

         time_used_today : function() {
            return ut.time_used_today();
         }
       }; // self =

       return self;
     } // newSiteBlock
  }; // self =

  return sbself;
})();

