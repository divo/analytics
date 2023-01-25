require 'json'

def handler(args)
  # data = JSON.parse(event.to_json, object_class: OpenStruct)

  return {
    "statusCode": 200,
    "body": "Hello from lambda",
  }
end

