"""
Lambda function to search for books by title/author
Replaces the Goodreads book fetching functionality
"""
import os
import json
from fetchBookMetadata import fetch_book_metadata

def lambda_handler(event, context):
    """
    Search for book metadata
    Expected query params: title (required), author (optional)
    Handles both direct Lambda invocation and API Gateway events
    """
    # Handle API Gateway event format
    if "queryStringParameters" in event:
        query_params = event.get("queryStringParameters") or {}
        title = query_params.get("title", "")
        author = query_params.get("author")
    # Handle direct Lambda invocation
    else:
        title = event.get("title", "")
        author = event.get("author")
    
    if not title:
        return {
            "statusCode": 400,
            "headers": {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*"
            },
            "body": json.dumps({"error": "Title parameter is required"})
        }
    
    # Fetch metadata
    result = fetch_book_metadata(title, author)
    
    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        "body": json.dumps(result)
    }

