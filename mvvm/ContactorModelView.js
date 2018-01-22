/*
* @Author: Marte
* @Date:   2018-01-19 15:03:21
* @Last Modified by:   Marte
* @Last Modified time: 2018-01-22 14:03:52
*/

'use strict';
function ContactorModelView (view, model) {
    let _ = this
    _.view = view
    _.model = model
    _.methods = {
        addContactor(contactor) {
            _.model.addContactor(contactor)
        },
        removeContactor(contactor) {
            _.model.removeContactor(contactor)
        }
    }
    _.initinizer()
    _.bindForm()
    _.bindList()
    _.bindEvents()
}
Object.assign(ContactorModelView.prototype, {
    initinizer () {
        this.addBtn = this.view.querySelector('[data-add]')
        this.ul = this.view.querySelectorAll('ul')[0]
        this.li = this.view.querySelectorAll('li')[0]
    },
    bindForm () {
        let addMethod = this.addBtn.getAttribute('data-add')
        let contactorInput = this.view.querySelector('[data-input]')
        this.addBtn.addEventListener('click', () => {
            let contactor = contactorInput.value
            if (contactor === '') {
                return
            }
            addMethod && this.methods[addMethod] && this.methods[addMethod](contactor)
        }, false)
    },
    clearField () {
        this.view.querySelector('[data-input]').value = ''
    },
    bindList () {
        let _ = this
        let contactors = _.model.getAllContatcors()
        _.ul.innerHTML = ''
        for (let contactor of contactors) {
            let li = _.li.cloneNode(true)
            li.querySelector('[data-text]').innerHTML = contactor
            li.querySelector('[data-remove]').addEventListener('click', deleteEventCb(contactor), false)
            _.ul.appendChild(li)
        }
        function deleteEventCb (contactor) {
            return function (e) {
                let deleteMethod = e.target.getAttribute('data-remove')
                // console.log(_.methods[deleteMethod])
                deleteMethod && _.methods[deleteMethod] && _.methods[deleteMethod](contactor)
            }
        }
    },
    bindEvents () {
        let _ = this
        function updateView () {
            _.bindList()
            _.clearField()
        }
        observer.subscribe('model.add.contactor', () => {
            updateView()
        })
        observer.subscribe('model.delete.contactor', () => {
            updateView()
        })
    }
})