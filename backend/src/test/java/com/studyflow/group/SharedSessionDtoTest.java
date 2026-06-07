package com.studyflow.group;

import org.junit.jupiter.api.Test;

import java.util.Arrays;

import static org.assertj.core.api.Assertions.assertThat;

class SharedSessionDtoTest {

    @Test
    void collaborationContractsExposeSharedSessionShareFields() throws Exception {
        Class<?> response = Class.forName("com.studyflow.group.GroupDto$SharedSessionResponse");

        assertThat(Arrays.stream(response.getRecordComponents()).map(component -> component.getName()))
                .contains(
                        "subjectName",
                        "startDateTime",
                        "plannedDuration",
                        "status",
                        "ownerName",
                        "sharedById",
                        "sharedBy",
                        "sharedByCurrentUser"
                )
                .doesNotContain("participants");
    }
}
