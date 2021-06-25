import { Label, List } from 'semantic-ui-react'

const MessageItem = (message) => {
	return (
		<List.Item>
			<List.Content>
				<List.Header>
					<Label as='a' style={{marginTop: '10px'}}>{message.message}</Label>
				</List.Header>
				<List.Description>
					<i>posted by {message.name}</i>
				</List.Description>
			</List.Content>
		</List.Item>
	)
}

export default MessageItem