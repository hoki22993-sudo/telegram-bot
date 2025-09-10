# tiny fallback for imghdr in Python 3.13+ where stdlib removed it
def what(file, h=None):
    """
    Accept filename or bytes-like object. Return a short string like 'jpeg', 'png', 'gif', or None.
    """
    data = None
    if h is not None:
        data = h
    else:
        try:
            if isinstance(file, (bytes, bytearray)):
                data = file
            else:
                with open(file, "rb") as f:
                    data = f.read(32)
        except Exception:
            return None

    if not data or len(data) < 4:
        return None
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"BM"):
        return "bmp"
    return None
