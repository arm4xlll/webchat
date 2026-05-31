package com.webchat.exception;

import com.webchat.admin.metrics.ErrorLogBuffer;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.stream.Collectors;

@RestControllerAdvice
@RequiredArgsConstructor
@Slf4j
public class GlobalExceptionHandler {

    private final ErrorLogBuffer errorLogBuffer;

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Bad request: {}", ex.getMessage());
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setDetail(ex.getMessage());
        return pd;
    }

    @ExceptionHandler(SecurityException.class)
    public ProblemDetail handleSecurity(SecurityException ex) {
        log.warn("Forbidden: {}", ex.getMessage());
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.FORBIDDEN);
        pd.setDetail(ex.getMessage());
        return pd;
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ProblemDetail handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult().getFieldErrors().stream()
                .map(e -> e.getField() + ": " + e.getDefaultMessage())
                .collect(Collectors.joining(", "));
        log.warn("Validation failed: {}", details);
        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        pd.setDetail(details);
        return pd;
    }

    @ExceptionHandler(org.springframework.web.servlet.resource.NoResourceFoundException.class)
    public ProblemDetail handleNotFound(org.springframework.web.servlet.resource.NoResourceFoundException ex) {
        String path = ex.getResourcePath();
        if (path != null && path.startsWith("ws/")) {
            log.debug("WS probe not found (expected): {}", path);
        } else {
            log.warn("Resource not found: {}", path);
        }
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, "Not found");
        return pd;
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGeneral(Exception ex, HttpServletRequest request) {
        // SSE connections have Content-Type: text/event-stream — ProblemDetail can't be serialized into it.
        // The emitter's onError callback handles cleanup; just return an empty 500.
        String accept = request.getHeader("Accept");
        if (accept != null && accept.contains("text/event-stream")) {
            if (!isClientDisconnect(ex)) {
                log.warn("Exception in SSE connection: {} {}", ex.getClass().getSimpleName(), ex.getMessage());
            }
            return ResponseEntity.internalServerError().build();
        }

        if (isClientDisconnect(ex)) {
            log.debug("Client disconnected: {}", ex.getMessage());
            return ResponseEntity.internalServerError().build();
        }

        log.error("Unexpected error", ex);

        StringWriter sw = new StringWriter();
        ex.printStackTrace(new PrintWriter(sw));
        errorLogBuffer.record(ex.getClass().getSimpleName(), ex.getMessage(), sw.toString());

        ProblemDetail pd = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        pd.setDetail("Internal server error");
        return ResponseEntity.internalServerError().body(pd);
    }

    private static boolean isClientDisconnect(Throwable t) {
        while (t != null) {
            if (t.getClass().getSimpleName().equals("ClientAbortException")) return true;
            if (t instanceof IOException && "Broken pipe".equals(t.getMessage())) return true;
            t = t.getCause();
        }
        return false;
    }
}
