import React from 'react';
import ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css'
import { Button, Container, Dimmer, Header, Input, Label, List, Loader, Segment } from 'semantic-ui-react'

import MessageItem from './components/MessageItem'
import hitApi from './services/api'

// const TEMP_MESSAGES_DATA = {
// 	data: [
// 	  {
// 	    id: 1,
// 	    name: "chris",
// 	    message: "hello world",
// 	    created_at: "2021-06-25T16:28:02.402Z",
// 	    updated_at: "2021-06-25T16:28:02.402Z"
// 	  },
// 	  {
// 	    id: 2,
// 	    name: "chris 2",
// 	    message: "this is great",
// 	    created_at: "2021-06-25T16:28:02.402Z",
// 	    updated_at: "2021-06-25T16:28:02.402Z"
// 	  },
// 	  {
// 	    id: 3,
// 	    name: "sabaitis",
// 	    message: "another message",
// 	    created_at: "2021-06-25T16:28:02.402Z",
// 	    updated_at: "2021-06-25T16:28:02.402Z"
// 	  }
// 	],
// 	errors: null
// }

const ALPHA_ADVANTAGE_API_KEY = '6KQUP90TQJ4ZTYK3' // should be env var
const ALPHA_ADVANTAGE_API = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&apikey=${ALPHA_ADVANTAGE_API_KEY}&symbol=`
const MESSAGES_API_CREATE = 'https://rails-chat-forum-api.herokuapp.com/api/create_message'
const MESSAGES_API_FETCH = 'https://rails-chat-forum-api.herokuapp.com/api/get_messages'

const buildMessage = (id, name, message) => {
	return (<MessageItem key={id} name={name} message={message}/>)
}

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

	updateName = (name) => {this.setState({userName: name})}
	updateMessage = (message) => {this.setState({userMessage: message})}
	updateMessages = (messages) => {this.setState({messages: messages.data.reverse()})}
	toggleScroll = () => {this.setState({scroll: !this.state.scroll})}
	toggleSendingLoader = () => {this.setState({sendingLoader: !this.state.sendingLoader})}

	scrollToBottom = () => {this.endOfMessages.scrollIntoView()}

	handleInput = (e, inputName) => {
		let value = e.target.value
		if(inputName == 'name'){
			this.updateName(value)
		} else if(inputName == 'message'){
			this.updateMessage(value)
		}
	}

	componentDidMount = () => {
		this.fetchMessages()
		this.fetchMessagesTimer()
		this.scrollToBottom()
	}

	componentDidUpdate = () => {
		if(this.state.scroll){
			this.scrollToBottom()
			this.toggleScroll()
		}
	}

	fetchMessages = () => {
		let data = hitApi(MESSAGES_API_FETCH)
		data.then(response => {this.updateMessages(response)})
	}

	fetchMessagesTimer() {
		setTimeout(() => {
			this.fetchMessages()
			this.fetchMessagesTimer()
		}, 2000)
	}

	replaceTextWithQuote = (message, quote) => {
		let stock = quote['01. symbol']
		let price = quote['05. price']
		let newMessage = message.replaceAll(`$${stock}`,`$${price}`)
		return newMessage
	}

	parseStocks = async (message) => {
		let re = /(\$[A-Za-z]+)/g 
		let stocks = message.match(re)
		let urlBase = ALPHA_ADVANTAGE_API
		let urls = []
		let newMessage = message
		
		if(!stocks){
			return message
		}

		stocks.map(stock => {
			let uri = `${urlBase}${stock.slice(1)}`
			let r = Promise.all([hitApi(uri)])
			urls.push(r)
		})
		return Promise.all(urls).then(data => {
			data.map(quote => {
				newMessage = this.replaceTextWithQuote(newMessage, quote[0]['Global Quote'])
			})
			return newMessage
		})
	}


	sendMessage() {
		this.toggleSendingLoader()
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
					this.toggleScroll()
					this.toggleSendingLoader()
					this.updateName('')
					this.updateMessage('')
				})
			})
		}
	}

	messagesSegment() {
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
									(message) => buildMessage(message.id, message.name, message.message)
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

	inputSegment(){
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