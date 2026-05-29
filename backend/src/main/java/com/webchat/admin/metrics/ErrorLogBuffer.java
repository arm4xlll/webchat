package com.webchat.admin.metrics;

import com.webchat.admin.dto.ErrorEntryDto;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

@Component
public class ErrorLogBuffer {

    private static final int MAX_SIZE = 100;
    private final Deque<ErrorEntryDto> buffer = new ArrayDeque<>(MAX_SIZE);

    public synchronized void record(String type, String message, String stackTrace) {
        if (buffer.size() >= MAX_SIZE) buffer.pollFirst();
        buffer.addLast(new ErrorEntryDto(Instant.now(), type, message, stackTrace));
    }

    public synchronized List<ErrorEntryDto> getLast(int n) {
        List<ErrorEntryDto> list = new ArrayList<>(buffer);
        int from = Math.max(0, list.size() - n);
        List<ErrorEntryDto> slice = new ArrayList<>(list.subList(from, list.size()));
        java.util.Collections.reverse(slice);
        return slice;
    }
}
