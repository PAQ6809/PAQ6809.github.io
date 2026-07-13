package io.github.paq6809.reelscribe.manager

import java.nio.ByteBuffer

internal fun ByteBuffer.putShort(value: Int): ByteBuffer = putShort(value.toShort())
