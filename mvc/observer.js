/*
* @Author: Marte
* @Date:   2018-01-19 14:13:35
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-19 14:31:26
*/

'use strict';
let observer = (function () {
    let events = {}
    return {
        subscribe (eventName, callback) {
            if (!events.hasOwnProperty(eventName)) {
                events[eventName] = []
            }
            events[eventName].push(callback)
        },
        unsubscribe (eventName, callback) {
            if (!events.hasOwnProperty(eventName)) {
                return
            }
            events[eventName] = events[eventName].filter(x => x !== callback)
        },
        publish (eventName, ...args) {
            if (!events.hasOwnProperty(eventName)) {
                return
            }
            let callbacks = events[eventName]
            for (let callback of callbacks) {
                callback.apply(this, args)
            }
        }
    }
}())