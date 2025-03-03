# Distributed under the OSI-approved BSD 3-Clause License.
# See accompanying file LICENSE.txt for details.

cmake_minimum_required(VERSION 3.25)
get_filename_component(SCRIPT_NAME "${CMAKE_CURRENT_LIST_FILE}" NAME_WE)
set(CMAKE_MESSAGE_INDENT "[${VERSION}][${LANGUAGE}] ")
set(CMAKE_MESSAGE_INDENT_BACKUP "${CMAKE_MESSAGE_INDENT}")
message(STATUS "-------------------- ${SCRIPT_NAME} --------------------")


set(CMAKE_MODULE_PATH   "${PROJ_CMAKE_MODULES_DIR}")
find_package(Git        MODULE REQUIRED)
find_package(Conda      MODULE REQUIRED)
include(LogUtils)
include(GitUtils)
include(JsonUtils)


message(STATUS "Determining which reference to switch to...")
file(READ "${REFERENCES_JSON_PATH}" REFERENCES_JSON_CNT)
get_reference_of_latest_from_repo_and_current_from_json(
    IN_LOCAL_PATH                   "${PROJ_OUT_REPO_DIR}"
    IN_JSON_CNT                     "${REFERENCES_JSON_CNT}"
    IN_VERSION_TYPE                 "${VERSION_TYPE}"
    IN_BRANCH_NAME                  "${BRANCH_NAME}"
    IN_TAG_PATTERN                  "${TAG_PATTERN}"
    IN_TAG_SUFFIX                   "${TAG_SUFFIX}"
    IN_DOT_NOTATION                 ".pot"
    OUT_LATEST_OBJECT               LATEST_POT_OBJECT
    OUT_LATEST_REFERENCE            LATEST_POT_REFERENCE
    OUT_CURRENT_OBJECT              CURRENT_POT_OBJECT
    OUT_CURRENT_REFERENCE           CURRENT_POT_REFERENCE)
if (MODE_OF_UPDATE STREQUAL "COMPARE")
    if (NOT CURRENT_POT_REFERENCE STREQUAL LATEST_POT_REFERENCE)
        set(SWITCH_POT_REFERENCE    "${LATEST_POT_REFERENCE}")
    else()
        set(SWITCH_POT_REFERENCE    "${CURRENT_POT_REFERENCE}")
    endif()
elseif (MODE_OF_UPDATE STREQUAL "ALWAYS")
    set(SWITCH_POT_REFERENCE        "${LATEST_POT_REFERENCE}")
elseif (MODE_OF_UPDATE STREQUAL "NEVER")
    if (NOT CURRENT_POT_REFERENCE)
        set(SWITCH_POT_REFERENCE    "${LATEST_POT_REFERENCE}")
    else()
        set(SWITCH_POT_REFERENCE    "${CURRENT_POT_REFERENCE}")
    endif()
else()
    message(FATAL_ERROR "Invalid MODE_OF_UPDATE value. (${MODE_OF_UPDATE})")
endif()
remove_cmake_message_indent()
message("")
message("LATEST_POT_OBJECT      = ${LATEST_POT_OBJECT}")
message("CURRENT_POT_OBJECT     = ${CURRENT_POT_OBJECT}")
message("LATEST_POT_REFERENCE   = ${LATEST_POT_REFERENCE}")
message("CURRENT_POT_REFERENCE  = ${CURRENT_POT_REFERENCE}")
message("MODE_OF_UPDATE         = ${MODE_OF_UPDATE}")
message("SWITCH_POT_REFERENCE   = ${SWITCH_POT_REFERENCE}")
message("")
restore_cmake_message_indent()


message(STATUS "Switching to the reference '${SWITCH_POT_REFERENCE}' on the local branch 'current'...")
remove_cmake_message_indent()
message("")
switch_to_git_reference_on_branch(
    IN_LOCAL_PATH   "${PROJ_OUT_REPO_DIR}"
    IN_REFERENCE    "${SWITCH_POT_REFERENCE}"
    IN_BRANCH       "current")
message("")
restore_cmake_message_indent()


message(STATUS "Determining whether to install the requirements...")
set(CURRENT_REFERENCE "${SWITCH_POT_REFERENCE}")
if (EXISTS "${PREV_REFERENCE_TXT_PATH}")
    file(READ "${PREV_REFERENCE_TXT_PATH}" PREVIOUS_REFERENCE)
else()
    set(PREVIOUS_REFERENCE "")
endif()
if (MODE_OF_INSTALL STREQUAL "COMPARE")
    if (NOT CURRENT_REFERENCE STREQUAL PREVIOUS_REFERENCE)
        set(INSTALL_REQUIRED    ON)
    else()
        set(INSTALL_REQUIRED    OFF)
    endif()
elseif (MODE_OF_INSTALL STREQUAL "ALWAYS")
    set(INSTALL_REQUIRED        ON)
else()
    message(FATAL_ERROR "Invalid MODE_OF_INSTALL value. (${MODE_OF_INSTALL})")
endif()
remove_cmake_message_indent()
message("")
message("CURRENT_REFERENCE  = ${CURRENT_REFERENCE}")
message("PREVIOUS_REFERENCE = ${PREVIOUS_REFERENCE}")
message("MODE_OF_INSTALL    = ${MODE_OF_INSTALL}")
message("INSTALL_REQUIRED   = ${INSTALL_REQUIRED}")
message("")
restore_cmake_message_indent()


if (NOT INSTALL_REQUIRED)
    message(STATUS "No need to install the requirements.")
    return()
else()
    message(STATUS "Prepare to install the requirements.")
endif()


message(STATUS "Running 'conda create' command to (re)create the virtual environemnt...")
remove_cmake_message_indent()
message("")
execute_process(
    COMMAND ${Conda_EXECUTABLE} create
            --prefix ${PROJ_CONDA_DIR}
            --yes
    ECHO_OUTPUT_VARIABLE
    ECHO_ERROR_VARIABLE
    RESULT_VARIABLE RES_VAR
    OUTPUT_VARIABLE OUT_VAR OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_VARIABLE  ERR_VAR ERROR_STRIP_TRAILING_WHITESPACE)
if (RES_VAR EQUAL 0)
    if (ERR_VAR)
        string(APPEND WARNING_REASON
        "The command succeeded with warnings.\n\n"
        "    result:\n\n${RES_VAR}\n\n"
        "    stderr:\n\n${ERR_VAR}")
        message("${WARNING_REASON}")
    endif()
else()
    string(APPEND FAILURE_REASON
    "The command failed with fatal errors.\n\n"
    "    result:\n\n${RES_VAR}\n\n"
    "    stderr:\n\n${ERR_VAR}")
    message(FATAL_ERROR "${FAILURE_REASON}")
endif()
message("")
restore_cmake_message_indent()


message(STATUS "Running 'conda install' command to install dependencies...")
remove_cmake_message_indent()
message("")
execute_process(
    COMMAND ${Conda_EXECUTABLE} install
            conda-forge::python=${VERSION_OF_PYTHON}
            conda-forge::sphinx=${VERSION_OF_SPHINX}
            --channel conda-forge
            --prefix ${PROJ_CONDA_DIR}
            --yes
    ECHO_OUTPUT_VARIABLE
    ECHO_ERROR_VARIABLE
    RESULT_VARIABLE RES_VAR
    OUTPUT_VARIABLE OUT_VAR OUTPUT_STRIP_TRAILING_WHITESPACE
    ERROR_VARIABLE  ERR_VAR ERROR_STRIP_TRAILING_WHITESPACE)
if (RES_VAR EQUAL 0)
    if (ERR_VAR)
        string(APPEND WARNING_REASON
        "The command succeeded with warnings.\n\n"
        "    result:\n\n${RES_VAR}\n\n"
        "    stderr:\n\n${ERR_VAR}")
        message("${WARNING_REASON}")
    endif()
else()
    string(APPEND FAILURE_REASON
    "The command failed with fatal errors.\n\n"
    "    result:\n\n${RES_VAR}\n\n"
    "    stderr:\n\n${ERR_VAR}")
    message(FATAL_ERROR "${FAILURE_REASON}")
endif()
message("")
restore_cmake_message_indent()


set(Python_ROOT_DIR     "${PROJ_CONDA_DIR}")
find_package(Python     MODULE REQUIRED)
message(STATUS "Running 'python -c \"import sys; print('\\n'.join(sys.path))\"' command to check python system paths...")
remove_cmake_message_indent()
message("")
execute_process(
    COMMAND ${Python_EXECUTABLE} -c "import sys; print('\\n'.join(sys.path))"
    ECHO_OUTPUT_VARIABLE
    ECHO_ERROR_VARIABLE)
message("")
restore_cmake_message_indent()


set(Sphinx_ROOT_DIR     "${PROJ_CONDA_DIR}")
find_package(Sphinx     MODULE REQUIRED)


file(WRITE "${PREV_REFERENCE_TXT_PATH}" "${CURRENT_REFERENCE}")
execute_process(
    COMMAND ${Conda_EXECUTABLE} list --export --prefix ${PROJ_CONDA_DIR}
    OUTPUT_FILE "${PREV_PACKAGES_TXT_PATH}")
