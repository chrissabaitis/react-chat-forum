import React from 'react';
import ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css'
import { Button, Container, Dimmer, Header, Input, Label, List, Loader, Segment } from 'semantic-ui-react'

import MessageItem from './components/MessageItem'
import hitApi from './services/api'

const ALPHA_ADVANTAGE_API_KEY = '6KQUP90TQJ4ZTYK3' // should be env var
const ALPHA_ADVANTAGE_API = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&apikey=${ALPHA_ADVANTAGE_API_KEY}&symbol=`
const MESSAGES_API_CREATE = 'https://rails-chat-forum-api.herokuapp.com/api/create_message'
const MESSAGES_API_FETCH = 'https://rails-chat-forum-api.herokuapp.com/api/get_messages'

class ChatForum extends React.Component{
	constructor() {
		super()
		this.state = {
			messages: [],
			scroll: true,
			userName: '',
			userMessage: '',
			sendingLoader: false
		}
	}

	// update our state variables
	updateName = (name) => {this.setState({userName: name})}
	updateMessage = (message) => {this.setState({userMessage: message})}
	updateMessages = (messages) => {this.setState({messages: messages.data.reverse()})}
	toggleScroll = () => {this.setState({scroll: !this.state.scroll})}
	toggleSendingLoader = () => {this.setState({sendingLoader: !this.state.sendingLoader})}

	scrollToBottom = () => {this.endOfMessages.scrollIntoView()}

	handleInput = (e, inputName) => {
		let value = e.target.value
		if(inputName === 'name'){
			this.updateName(value)
		} else if(inputName === 'message'){
			this.updateMessage(value)
		}
	}

	componentDidMount = () => {
		this.fetchMessages()
		this.fetchMessagesTimer()
		this.scrollToBottom()
	}

	componentDidUpdate = () => {
		// only scroll after messages are pulled from the server
		if(this.state.scroll){
			this.scrollToBottom()
			this.toggleScroll()
		}
	}

	fetchMessages = () => {
		let data = hitApi(MESSAGES_API_FETCH)
		data.then(response => {this.updateMessages(response)})
	}

	// recurring function to fetch messages every 2 secs
	fetchMessagesTimer = () => {
		setTimeout(() => {
			this.fetchMessages()
			this.fetchMessagesTimer()
		}, 2000)
	}

	// alpha advantage (AA)-specific function to replace text with the quote data
	replaceTextWithQuoteAlphaAdv = (message, quote) => {
		let stock = quote['01. symbol']
		let price = quote['05. price']
		let newMessage = message.replaceAll(`$${stock}`,`$${price}`)
		return newMessage
	}

	parseStocks = async (message) => {
		let re = /(\$[A-Za-z]+)/g // regex to get text with format '$xxx'
		let stocks = message.match(re)
		let urlBase = ALPHA_ADVANTAGE_API
		let newMessage = message
		
		// return if message contains no stocks
		if(!stocks){
			return message
		}

		// map each stock with it's price
		let urls = stocks.map(stock => {
			let uri = `${urlBase}${stock.slice(1)}`
			let r = Promise.all([hitApi(uri)])
			return r
		})
		return Promise.all(urls).then(data => {
			data.map(quote => {
				newMessage = this.replaceTextWithQuoteAlphaAdv(newMessage, quote[0]['Global Quote'])
			})
			return newMessage
		})
	}

	sendMessage = () => {
		this.toggleSendingLoader() // show loader
		const {userName, userMessage} = this.state
		if(userName && userMessage){
			this.parseStocks(userMessage).then(parsedMessage => {
				let data = hitApi(
					MESSAGES_API_CREATE,
					JSON.stringify({name: userName, message: parsedMessage}),
					'POST'
				)
				data.then(response => {
					this.updateMessages(response)
					this.toggleScroll() // scroll to bottom
					this.toggleSendingLoader() // hide loader
					this.updateName('')
					this.updateMessage('')
				})
			})
		}
	}

	// use the MessageItem component + any other decorators that might be necessary
	buildMessage = (id, name, message) => {
		return (<MessageItem key={id} name={name} message={message}/>)
	}

	messagesSegment = () => {
		let messages = this.state.messages
		let sendingLoader = this.state.sendingLoader
		return(
			<Segment>
				{sendingLoader && 
					<Dimmer active inverted>
				        <Loader>Loading</Loader>
				    </Dimmer>
				}
				<div style={{height: "25em", overflowY: 'scroll'}}>
					<Label.Group color='blue'>
						{messages && messages.length > 0 && 
							<List divided relaxed>
								{messages.map(
									(message) => this.buildMessage(message.id, message.name, message.message)
								)}
							</List>
						}
						{(!messages || (messages && messages.length === 0)) &&
							<Header as='h2' style={{
								display: 'flex',
							    alignItems: 'center',
							    justifyContent: 'center'
							}}>No messages yet!</Header>
						}
						<div 
							style={{float: 'left', clear: 'both'}}
							ref={endOfMessages => {this.endOfMessages = endOfMessages}}
						></div>
					</Label.Group>
				</div>
			</Segment>
		)
	}

	inputSegment = () =>{
		return(
			<div>
				<Input
					label='name'
					style={{width: "50%", marginBottom: "10px"}}
					placeholder='Chris'
					value={this.state.userName || ''}
					onChange={(val) => this.handleInput(val, 'name')}
				/>
				<br />
				<Input 
					label='message' 
					style={{width: "50%", marginBottom: "10px"}} 
					placeholder='Hello world'
					value={this.state.userMessage || ''}
					onChange={(val) => this.handleInput(val, 'message')}
				/>
				<br />
				<Button color='green' onClick={() => this.sendMessage()}>Post Message</Button>
			</div>
		)
	}

	render() {
		return (
			<Container>
				{this.messagesSegment()}
				{this.inputSegment()}
			</Container>
		)
	}
}


ReactDOM.render(
	<ChatForum />,
	document.getElementById('root')
)