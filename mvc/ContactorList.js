/*
* @Author: Marte
* @Date:   2018-01-19 14:42:53
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-19 16:44:23
*/

'use strict';
function ContactorList () {
    this.ul = document.createElement('ul')
    this.li = document.createElement('li')
    this.span = document.createElement('span')
    this.button = document.createElement('button')
}

Object.assign(ContactorList.prototype, {
    render (listdata) {
        for (let contactor of listdata) {
            let li = this.createItem(contactor)
            this.ul.appendChild(li)
        }
        document.body.appendChild(this.ul)
        this.bindEvents()
    },
    createItem (contactor) {
        let li = this.li.cloneNode(false)
        let span = this.span.cloneNode(false)
        let button = this.button.cloneNode(false)
        span.innerHTML = contactor
        button.innerHTML = "删除"
        li.appendChild(span)
        li.appendChild(button)
        return li
    },
    bindEvents () {
        this.ul.addEventListener('click', (e) => {
            if (e.target.previousSibling) {
                let contactor = e.target.previousSibling.innerHTML
                contactor && observer.publish('view.delete.contactor', contactor)
            }
        }, false)
        observer.subscribe('model.add.contactor', (contactor) => {
            this.addContactor(contactor)
        })
        observer.subscribe('model.delete.contactor', (contactor) => {
            this.removeContactor(contactor)
        })
    },
    addContactor (contactor) {
        this.ul.insertBefore(this.createItem(contactor), this.ul.firstChild)
    },
    removeContactor (contactor) {
        for (let li of this.ul.childNodes) {
            if (li.childNodes[0].innerHTML === contactor) {
                this.ul.removeChild(li)
                break
            }
        }
    }
})