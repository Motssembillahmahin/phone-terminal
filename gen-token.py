#!/usr/bin/env python3
import secrets
import string
import sys


def generate_token(length=32):
    chars = string.ascii_letters + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


if __name__ == "__main__":
    length = int(sys.argv[1]) if len(sys.argv) > 1 else 32
    token = generate_token(length)
    print(token)
