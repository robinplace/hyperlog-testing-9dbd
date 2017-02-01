import 'style'

import Levelup from 'levelup'
import Memdown from 'memdown'
import Hyperlog from 'hyperlog'
import Ws from 'websocket-stream'

const up = Levelup ('counter', { db: Memdown })
window.up = up
const log = Hyperlog (up, { valueEncoding: 'json' })
window.log = log

class Counter extends React.Component {
	constructor () {
		super ()
		this.state = { nodes: [], isOnline: false }
	}
	componentDidMount () {
		log.on ('add', this.updateNodes.bind (this))
		this.setOnline (true)
	}
	setOnline (isOnline) {
		if (isOnline) {
			this.r = log.replicate ({ live: true })
			this.ws = Ws (`ws://${window.location.host}/socket`)
			this.ws.pipe (this.r).pipe (this.ws)
		} else {
			if (this.ws) this.ws.socket.close ()
		}
		this.setState ({ isOnline })
	}
	getTree () {
		return new Promise ((resolve, reject) => {
			const nodes = {}
			let leads = 1
	
			const doAccumulate = (node, from) => {
				leads --
				if (nodes [node.key]) {
					nodes [node.key].from.push (from)
					return
				}
				if (node.key) {
					nodes [node.key] = {
						value: node.value,
						key: node.key,
						from: from ? [ from ] : [],
						to: node.links,
					}
				}

				node.links.forEach ((nodeKey, i) => {
					leads ++
					const from = node.key
					log.get (nodeKey, (err, node) => {
						if (err) return reject ()
						doAccumulate (node, from)
					})
				})
				if (leads === 0) {
					resolve (nodes)
				}
			}
			log.heads ((err, heads) => {
				if (err) return reject ()
				doAccumulate ({ key: null, value: null, links: heads.map (head => head.key) })
			})
		})
	}
	updateNodes () {
		this.getTree ()
		.then (nodes => {
			window.map = _.map
			window.nodes = nodes
			_.forEach (nodes, node => {
				node._toCount = node.to.length
				node._fromCount = node.from.length
			})
			const heads = _.filter (nodes, node => !node.from.length)
			const sorted = []
			const walkLinks = links => {
				links.sort ((linkA, linkB) => {
					// neither are a timestamp, should never happen
					if (linkA.value.type !== 'OKAY' && linkB.value.type !== 'OKAY') return 0
					// both have server timestamps, compare them
					if (linkA.value.type === 'OKAY' && linkB.value.type === 'OKAY') {
						if (linkA.value.time > linkB.value.time) return -1
						if (linkA.value.time < linkB.value.time) return 1
						return 0
					}
					if (linkA.value.type !== 'OKAY') return -1
					if (linkB.value.type !== 'OKAY') return 1
				}).forEach (link => {
					if (link._fromCount > 1) {
						link._fromCount --
						return
					}
					sorted.push (link)
					walkLinks (link.to.map (linkKey => nodes [linkKey]))
				})
			}
			walkLinks (heads)
			this.setState ({ nodes: sorted })
		})
	}
	render () {
		return (
			<div style={{ paddingLeft: 60 }}>
				<h1>Hyperlog</h1>
				<button onClick={ () => {
					log.append ({ type: 'DATA', data: Date.now ().toString ().slice (-7, -3), user: location.hash })
				} }>Add a number</button>
				<label><input type="checkbox" onChange={ ev => this.setOnline (ev.target.checked) } checked={ this.state.isOnline }/> Online</label>
				<ul>
					{ this.state.nodes.map ((node, i) => {
						if (node.value.type === 'DATA') return <li key={ i }>{ node.value.data }</li>
					}) }
				</ul>
			</div>
		)
	}
}

import { render } from 'react-dom'

render ((
	<Counter/>
), document.body.firstChild)
