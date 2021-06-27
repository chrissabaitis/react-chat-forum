const hitApi = async (url, body=null, method='GET') => {
	let response = await fetch(url,{
		method: method,
		body: body,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json'
		}
	})
	.then(res => res.json())
	.then(data => {
		return data
	})
	return response
}

export default hitApi