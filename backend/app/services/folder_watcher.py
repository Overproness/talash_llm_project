"""
Folder Watcher — monitors cv_uploads/ for new PDFs and auto-processes them.
Uses watchdog for file system events.
"""

import asyncio
import logging
import os
from pathlib import Path

from watchdog.events import FileSystemEventHandler, FileCreatedEvent
from watchdog.observers import Observer

logger = logging.getLogger(__name__)


class CVUploadHandler(FileSystemEventHandler):
    """Watchdog handler that queues new PDF files for processing."""

    def __init__(self, processing_queue: asyncio.Queue):
        self.queue = processing_queue

    def on_created(self, event: FileCreatedEvent):
        if not event.is_directory and event.src_path.lower().endswith(".pdf"):
            logger.info(f"New CV detected: {event.src_path}")
            # Schedule processing on the event loop
            asyncio.get_event_loop().call_soon_threadsafe(
                self.queue.put_nowait, event.src_path
            )


class FolderWatcher:
    """Watches a directory for new PDF uploads."""

    def __init__(self, watch_dir: str, processing_queue: asyncio.Queue):
        self.watch_dir = watch_dir
        self.queue = processing_queue
        self._observer = Observer()
        self._handler = CVUploadHandler(processing_queue)

    def start(self):
        os.makedirs(self.watch_dir, exist_ok=True)
        self._observer.schedule(self._handler, self.watch_dir, recursive=False)
        self._observer.start()
        logger.info(f"Watching {self.watch_dir} for new CVs")

    def stop(self):
        self._observer.stop()
        self._observer.join()
        logger.info("Folder watcher stopped")
