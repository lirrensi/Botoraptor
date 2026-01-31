"""
Pydantic models for ChatLayer SDK.

These models mirror the TypeScript types from the Node.js SDK for type parity.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class AttachmentType(str, Enum):
    """Attachment type enumeration."""

    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    FILE = "file"


class MessageType(str, Enum):
    """Message type enumeration."""

    USER_MESSAGE = "user_message"
    USER_MESSAGE_SERVICE = "user_message_service"
    BOT_MESSAGE_SERVICE = "bot_message_service"
    MANAGER_MESSAGE = "manager_message"
    SERVICE_CALL = "service_call"
    ERROR_MESSAGE = "error_message"


class ListenerType(str, Enum):
    """Listener type for polling."""

    BOT = "bot"
    UI = "ui"


class Attachment(BaseModel):
    """
    Attachment model representing a file attachment in a message.

    Mirrors the TypeScript Attachment type from the SDK.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = None
    type: AttachmentType
    is_external: Optional[bool] = Field(default=None, alias="isExternal")
    url: Optional[str] = None
    filename: Optional[str] = None
    original_name: Optional[str] = Field(default=None, alias="original_name")
    mime_type: Optional[str] = Field(default=None, alias="mime_type")
    size: Optional[int] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")


class Message(BaseModel):
    """
    Message model representing a chat message.

    Mirrors the TypeScript Message type from the SDK.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[str] = None
    bot_id: str = Field(alias="botId")
    room_id: str = Field(alias="roomId")
    user_id: str = Field(alias="userId")
    username: Optional[str] = None
    name: Optional[str] = None
    text: Optional[str] = None
    message_type: Optional[Union[MessageType, str]] = Field(
        default=None, alias="messageType"
    )
    attachments: Optional[List[Attachment]] = None
    meta: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")


class User(BaseModel):
    """
    User model representing a chat user.

    Mirrors the TypeScript User type from the SDK.
    """

    model_config = ConfigDict(populate_by_name=True)

    id: Optional[int] = None
    bot_id: str = Field(alias="botId")
    user_id: str = Field(alias="userId")
    username: str
    name: Optional[str] = None
    created_at: Optional[datetime] = Field(default=None, alias="createdAt")
    blocked: Optional[bool] = None


class RoomInfo(BaseModel):
    """
    Room information model.

    Mirrors the TypeScript RoomInfo type from the SDK.
    """

    model_config = ConfigDict(populate_by_name=True)

    bot_id: str = Field(alias="botId")
    room_id: str = Field(alias="roomId")
    users: List[User]
    last_message: Optional[Message] = Field(default=None, alias="lastMessage")


class ChatLayerConfig(BaseModel):
    """
    Configuration for ChatLayer SDK client.

    Mirrors the TypeScript ChatLayerConfig type from the SDK.
    """

    model_config = ConfigDict(populate_by_name=True)

    api_key: str = Field(alias="apiKey")
    base_url: Optional[str] = Field(default="/", alias="baseUrl")
    bot_id: Optional[str] = Field(default=None, alias="botId")
    bot_ids: Optional[List[str]] = Field(default=None, alias="botIds")
    listener_type: Optional[ListenerType] = Field(default=None, alias="listenerType")
    timeout_ms: Optional[int] = Field(default=60000, alias="timeoutMs")
    poll_delay_ms: Optional[int] = Field(default=1000, alias="pollDelayMs")
    on_error: Optional[Any] = Field(default=None, alias="onError")


class FileUploadOptions(BaseModel):
    """Options for file upload operations."""

    model_config = ConfigDict(populate_by_name=True)

    type: Optional[AttachmentType] = None
    filename: Optional[str] = None
    mime: Optional[str] = None


class FileUploadByUrlOptions(BaseModel):
    """Options for uploading files by URL."""

    model_config = ConfigDict(populate_by_name=True)

    url: str
    filename: Optional[str] = None
    type: Optional[AttachmentType] = None


class GetMessagesParams(BaseModel):
    """Parameters for get_messages method."""

    model_config = ConfigDict(populate_by_name=True)

    bot_id: Optional[str] = Field(default=None, alias="botId")
    room_id: Optional[str] = Field(default=None, alias="roomId")
    limit: Optional[int] = None
    cursor_id: Optional[Union[int, str]] = Field(default=None, alias="cursorId")
    types: Optional[str] = None


class GetRoomsParams(BaseModel):
    """Parameters for get_rooms method."""

    model_config = ConfigDict(populate_by_name=True)

    bot_id: Optional[str] = Field(default=None, alias="botId")
    message_type: Optional[Union[MessageType, str]] = Field(
        default=None, alias="messageType"
    )
    depth: Optional[int] = None


class ServerResponse(BaseModel):
    """Generic server response wrapper."""

    model_config = ConfigDict(populate_by_name=True)

    success: bool
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
    data: Optional[Any] = None


class RoomsResponse(BaseModel):
    """Response from get_rooms endpoint."""

    model_config = ConfigDict(populate_by_name=True)

    rooms: List[RoomInfo]
